import { NextResponse } from "next/server";
import { isApolloConfigured, searchSequences, searchOutreachEmails } from "@/lib/integrations/apollo";
import { buildActivityFromEmails } from "@/lib/apollo-mapper";
import { db, getDb } from "@/lib/db";
import { pipelineEvents, leads, agentRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // ── Apollo path ──────────────────────────────────────────────────────
    if (isApolloConfigured()) {
      const sequences = await searchSequences({ activeOnly: true });
      const sequenceIds = sequences.map(s => s.id);

      if (sequenceIds.length === 0) {
        return NextResponse.json({ events: [], recentRuns: [] });
      }

      const { emails } = await searchOutreachEmails(sequenceIds, { perPage: 50 });
      const events = buildActivityFromEmails(emails);

      // Build "recent runs" from sequence-level stats
      const recentRuns = sequences.map((s, i) => ({
        id: i + 1,
        agentType: "outreach_composer",
        status: s.active ? "completed" : "idle",
        startedAt: s.created_at,
        completedAt: s.created_at,
        itemsProcessed: s.unique_delivered,
        itemsFailed: s.unique_bounced,
        summary: `${s.name}: ${s.unique_delivered} delivered, ${s.unique_opened} opened, ${s.unique_replied} replied`,
        errorLog: null,
      }));

      return NextResponse.json({ events, recentRuns });
    }

    // ── SQLite fallback ──────────────────────────────────────────────────
    await getDb();
    const [events, recentRuns] = await Promise.all([
      db
        .select({
          id: pipelineEvents.id,
          leadId: pipelineEvents.leadId,
          fromStage: pipelineEvents.fromStage,
          toStage: pipelineEvents.toStage,
          trigger: pipelineEvents.trigger,
          notes: pipelineEvents.notes,
          createdAt: pipelineEvents.createdAt,
          companyName: leads.companyName,
        })
        .from(pipelineEvents)
        .leftJoin(leads, eq(pipelineEvents.leadId, leads.id))
        .orderBy(desc(pipelineEvents.createdAt))
        .limit(20),
      db
        .select()
        .from(agentRuns)
        .orderBy(desc(agentRuns.startedAt))
        .limit(10),
    ]);

    return NextResponse.json({ events, recentRuns });
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
