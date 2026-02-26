import { NextResponse } from "next/server";
import { db, getDb, checkAndClearSeedFlag } from "@/lib/db";
import { leads, outreachMessages } from "@/lib/db/schema";
import { eq, sql, and, lt } from "drizzle-orm";
import { seedDatabase } from "@/lib/db/seed";
import type { PipelineStage } from "@/types";
import { getWeeklyPacing } from "@/lib/agents/pipeline-intelligence";

export async function GET() {
  try {
    await getDb();
    // Auto-seed on first load if DB is empty
    if (checkAndClearSeedFlag()) {
      await seedDatabase();
    }

    const today = new Date().toISOString().split("T")[0];

    const [stageCounts, totalLeads, newToday, messagesSent, messagesQueued, responses, avgScore, staleCount] =
      await Promise.all([
        db.select({ stage: leads.pipelineStage, count: sql<number>`count(*)` })
          .from(leads).groupBy(leads.pipelineStage),
        db.select({ count: sql<number>`count(*)` }).from(leads),
        db.select({ count: sql<number>`count(*)` }).from(leads)
          .where(sql`date(${leads.createdAt}) = ${today}`),
        db.select({ count: sql<number>`count(*)` }).from(outreachMessages)
          .where(sql`date(${outreachMessages.sentAt}) = ${today}`),
        db.select({ count: sql<number>`count(*)` }).from(outreachMessages)
          .where(eq(outreachMessages.status, "draft")),
        db.select({ count: sql<number>`count(*)` }).from(outreachMessages)
          .where(sql`date(${outreachMessages.repliedAt}) = ${today}`),
        db.select({ avg: sql<number>`coalesce(avg(${leads.score}), 0)` }).from(leads),
        db.select({ count: sql<number>`count(*)` }).from(leads)
          .where(and(
            lt(leads.updatedAt, new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0]),
            sql`${leads.pipelineStage} NOT IN ('cold', 'closed_won', 'closed_lost')`,
          )),
      ]);

    const pipelineByStage: Record<string, number> = {
      cold: 0, contacted: 0, responded: 0, discovery_booked: 0,
      demo_completed: 0, proposal_sent: 0, negotiating: 0,
      closed_won: 0, closed_lost: 0,
    };
    for (const row of stageCounts) {
      pipelineByStage[row.stage] = row.count;
    }

    const activeStages: PipelineStage[] = ["contacted", "responded", "discovery_booked", "demo_completed", "proposal_sent", "negotiating"];
    const activeProspects = activeStages.reduce((sum, s) => sum + (pipelineByStage[s] || 0), 0);

    // Weekly pacing toward 3 discovery calls/week target
    const weeklyPacing = await getWeeklyPacing();

    return NextResponse.json({
      totalLeads: totalLeads[0].count,
      newLeadsToday: newToday[0].count,
      activeProspects,
      messagesQueuedToday: messagesQueued[0].count,
      messagesSentToday: messagesSent[0].count,
      responsesToday: responses[0].count,
      discoveryCallsThisWeek: pipelineByStage.discovery_booked,
      proposalsSentThisWeek: pipelineByStage.proposal_sent,
      pipelineByStage,
      responseRate: messagesSent[0].count > 0
        ? Math.round((responses[0].count / messagesSent[0].count) * 1000) / 10
        : 0,
      avgLeadScore: Math.round(avgScore[0].avg * 10) / 10,
      staleProspects: staleCount[0].count,
      weeklyPacing,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
