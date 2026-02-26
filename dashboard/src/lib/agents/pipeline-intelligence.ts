/**
 * Agent 3: Pipeline Intelligence (Tracking & Accountability)
 *
 * Trigger: Continuous monitoring + 7:30 AM and 5:00 PM ET daily
 * Purpose: Maintain pipeline visibility, ensure zero dropped opportunities,
 *          generate accountability reports.
 *
 * State Machine: Cold → Contacted → Responded → Discovery Booked →
 *                Demo Completed → Proposal Sent → Negotiating → Closed Won/Lost
 */

import { db } from "@/lib/db";
import { leads, pipelineEvents, outreachMessages, agentRuns } from "@/lib/db/schema";
import { eq, sql, and, lt } from "drizzle-orm";
import type { PipelineStage, DashboardStats } from "@/types";

// ─── Stale Detection ─────────────────────────────────────────────────────────
const STALE_THRESHOLD_DAYS = 5;

export async function detectStaleProspects(): Promise<{
  staleLeads: Array<{ id: number; companyName: string; stage: string; daysSinceActivity: number; recommendedAction: string }>;
}> {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_THRESHOLD_DAYS);
  const staleDateStr = staleDate.toISOString().split("T")[0];

  const stale = await db
    .select({
      id: leads.id,
      companyName: leads.companyName,
      stage: leads.pipelineStage,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(
      and(
        lt(leads.updatedAt, staleDateStr),
        sql`${leads.pipelineStage} NOT IN ('cold', 'closed_won', 'closed_lost')`
      )
    );

  return {
    staleLeads: stale.map((lead) => {
      const daysInactive = Math.floor(
        (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      let recommendedAction = "Send follow-up";
      if (lead.stage === "contacted" && daysInactive > 7)
        recommendedAction = "Switch channel (email → LinkedIn or vice versa)";
      if (lead.stage === "proposal_sent" && daysInactive > 5)
        recommendedAction = "Follow up on proposal — add urgency";
      if (lead.stage === "responded" && daysInactive > 3)
        recommendedAction = "Book discovery call ASAP";
      return {
        id: lead.id,
        companyName: lead.companyName,
        stage: lead.stage,
        daysSinceActivity: daysInactive,
        recommendedAction,
      };
    }),
  };
}

// ─── Pipeline Stats ──────────────────────────────────────────────────────────
export async function getPipelineStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split("T")[0];

  const stageCounts = await db
    .select({ stage: leads.pipelineStage, count: sql<number>`count(*)` })
    .from(leads)
    .groupBy(leads.pipelineStage);

  const totalLeads = await db.select({ count: sql<number>`count(*)` }).from(leads);
  const newToday = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(sql`date(${leads.createdAt}) = ${today}`);

  const messagesSent = await db
    .select({ count: sql<number>`count(*)` })
    .from(outreachMessages)
    .where(sql`date(${outreachMessages.sentAt}) = ${today}`);

  const messagesQueued = await db
    .select({ count: sql<number>`count(*)` })
    .from(outreachMessages)
    .where(eq(outreachMessages.status, "draft"));

  const responses = await db
    .select({ count: sql<number>`count(*)` })
    .from(outreachMessages)
    .where(sql`date(${outreachMessages.repliedAt}) = ${today}`);

  const pipelineByStage: Record<PipelineStage, number> = {
    cold: 0, contacted: 0, responded: 0, discovery_booked: 0,
    demo_completed: 0, proposal_sent: 0, negotiating: 0,
    closed_won: 0, closed_lost: 0,
  };
  for (const row of stageCounts) {
    pipelineByStage[row.stage as PipelineStage] = row.count;
  }

  const activeStages = ["contacted", "responded", "discovery_booked", "demo_completed", "proposal_sent", "negotiating"];
  const activeProspects = activeStages.reduce((sum, s) => sum + (pipelineByStage[s as PipelineStage] || 0), 0);

  const { staleLeads } = await detectStaleProspects();

  return {
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
    avgLeadScore: 0, // Calculated separately
    staleProspects: staleLeads.length,
  };
}

// ─── Morning Briefing Generator ──────────────────────────────────────────────
export async function generateMorningBriefing(): Promise<string> {
  const stats = await getPipelineStats();
  const { staleLeads } = await detectStaleProspects();

  const lines: string[] = [
    `TODAY'S PRIORITIES`,
    "",
  ];

  if (staleLeads.length > 0) {
    lines.push(`${staleLeads.length} stale prospects need attention:`);
    for (const lead of staleLeads.slice(0, 5)) {
      lines.push(`  - ${lead.companyName} (${lead.stage}, ${lead.daysSinceActivity}d inactive): ${lead.recommendedAction}`);
    }
    lines.push("");
  }

  lines.push(`PIPELINE SNAPSHOT`);
  lines.push(`  Active prospects: ${stats.activeProspects}`);
  lines.push(`  Stale (5+ days): ${stats.staleProspects}`);
  lines.push(`  Discovery calls booked: ${stats.discoveryCallsThisWeek}`);
  lines.push("");
  lines.push(`OUTREACH QUEUE`);
  lines.push(`  ${stats.messagesQueuedToday} new messages ready for review`);

  return lines.join("\n");
}

// ─── Evening Report Generator ────────────────────────────────────────────────
export async function generateEveningReport(): Promise<string> {
  const stats = await getPipelineStats();

  const lines: string[] = [
    `TODAY'S RESULTS`,
    `  Messages sent: ${stats.messagesSentToday} (target: 20)`,
    `  Responses received: ${stats.responsesToday}`,
    `  Discovery calls booked: ${stats.discoveryCallsThisWeek}`,
    "",
    `GAPS`,
  ];

  if (stats.messagesSentToday < 20) {
    lines.push(`  - Only ${stats.messagesSentToday}/20 messages sent today`);
  }
  if (stats.staleProspects > 0) {
    lines.push(`  - ${stats.staleProspects} prospects still stale`);
  }

  lines.push("");
  lines.push(`TOMORROW'S SETUP`);
  lines.push(`  ${stats.messagesQueuedToday} messages pre-drafted for morning outreach`);

  return lines.join("\n");
}
