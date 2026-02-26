/**
 * Agent 3: Pipeline Intelligence (Tracking & Accountability)
 *
 * Trigger: Continuous monitoring + 7:30 AM and 5:00 PM ET daily
 * Purpose: Maintain pipeline visibility, ensure zero dropped opportunities,
 *          generate accountability reports.
 *
 * State Machine: Cold → Contacted → Responded → Discovery Booked →
 *                Demo Completed → Proposal Sent → Negotiating → Closed Won/Lost
 *
 * Upgrades:
 *  - Pipeline velocity tracking (avg days per stage, stage-to-stage conversion)
 *  - Conversion funnels by vertical and template
 *  - Engagement-ranked daily action list with priority scores
 *  - Weekly target pacing (3 discovery calls / week)
 */

import { db, getDb } from "@/lib/db";
import { leads, outreachMessages, pipelineEvents } from "@/lib/db/schema";
import { eq, sql, and, lt } from "drizzle-orm";
import type { PipelineStage, DashboardStats } from "@/types";

// ─── Constants ──────────────────────────────────────────────────────────────
const STALE_THRESHOLD_DAYS = 5;
const WEEKLY_CALL_TARGET = 3;

// ─── Stale Detection ─────────────────────────────────────────────────────────
export async function detectStaleProspects(): Promise<{
  staleLeads: Array<{ id: number; companyName: string; stage: string; daysSinceActivity: number; recommendedAction: string }>;
}> {
  await getDb();
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
      if (lead.stage === "discovery_booked" && daysInactive > 3)
        recommendedAction = "Confirm discovery call — send reminder";
      if (lead.stage === "demo_completed" && daysInactive > 2)
        recommendedAction = "Send proposal within 24 hours";
      if (lead.stage === "negotiating" && daysInactive > 5)
        recommendedAction = "Re-engage decision maker — check for blockers";
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

// ─── Pipeline Velocity ──────────────────────────────────────────────────────

export interface StageVelocity {
  stage: PipelineStage;
  avgDaysInStage: number;
  leadsInStage: number;
  conversionRate: number; // % that moved to next stage
}

export async function getPipelineVelocity(): Promise<StageVelocity[]> {
  await getDb();

  const stageOrder: PipelineStage[] = [
    "cold", "contacted", "responded", "discovery_booked",
    "demo_completed", "proposal_sent", "negotiating",
  ];

  const velocities: StageVelocity[] = [];

  for (let i = 0; i < stageOrder.length; i++) {
    const stage = stageOrder[i];
    const nextStage = stageOrder[i + 1];

    // Count leads currently in this stage
    const [current] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.pipelineStage, stage));

    // Count events that moved FROM this stage
    const [movedOut] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.fromStage, stage));

    // Count events that moved TO the next stage (conversion)
    let convertedCount = 0;
    if (nextStage) {
      const [converted] = await db
        .select({ count: sql<number>`count(*)` })
        .from(pipelineEvents)
        .where(and(
          eq(pipelineEvents.fromStage, stage),
          eq(pipelineEvents.toStage, nextStage),
        ));
      convertedCount = converted.count;
    }

    // Average time in stage (from events)
    const avgDaysResult = await db
      .select({
        avgDays: sql<number>`COALESCE(AVG(
          CAST(julianday(${pipelineEvents.createdAt}) - julianday(
            (SELECT pe2.created_at FROM pipeline_events pe2
             WHERE pe2.lead_id = ${pipelineEvents.leadId}
             AND pe2.to_stage = ${stage}
             ORDER BY pe2.created_at DESC LIMIT 1)
          ) AS REAL)
        ), 0)`,
      })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.fromStage, stage));

    const totalThrough = movedOut.count + current.count;

    velocities.push({
      stage,
      avgDaysInStage: Math.round((avgDaysResult[0]?.avgDays || 0) * 10) / 10,
      leadsInStage: current.count,
      conversionRate: totalThrough > 0
        ? Math.round((convertedCount / totalThrough) * 1000) / 10
        : 0,
    });
  }

  return velocities;
}

// ─── Conversion Funnels by Vertical ─────────────────────────────────────────

export interface VerticalFunnel {
  vertical: string;
  totalLeads: number;
  contacted: number;
  responded: number;
  discoveryBooked: number;
  closed: number;
  contactToResponseRate: number;
  responseToBookingRate: number;
}

export async function getVerticalFunnels(): Promise<VerticalFunnel[]> {
  await getDb();

  const verticals = ["indoor_sports", "med_spa", "dental", "youth_sports"];
  const funnels: VerticalFunnel[] = [];

  for (const vertical of verticals) {
    const stages = await db
      .select({ stage: leads.pipelineStage, count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.vertical, vertical))
      .groupBy(leads.pipelineStage);

    const stageMap: Record<string, number> = {};
    let total = 0;
    for (const row of stages) {
      stageMap[row.stage] = row.count;
      total += row.count;
    }

    const contacted = (stageMap["contacted"] || 0) + (stageMap["responded"] || 0) +
      (stageMap["discovery_booked"] || 0) + (stageMap["demo_completed"] || 0) +
      (stageMap["proposal_sent"] || 0) + (stageMap["negotiating"] || 0) +
      (stageMap["closed_won"] || 0) + (stageMap["closed_lost"] || 0);

    const responded = (stageMap["responded"] || 0) + (stageMap["discovery_booked"] || 0) +
      (stageMap["demo_completed"] || 0) + (stageMap["proposal_sent"] || 0) +
      (stageMap["negotiating"] || 0) + (stageMap["closed_won"] || 0) + (stageMap["closed_lost"] || 0);

    const discoveryBooked = (stageMap["discovery_booked"] || 0) + (stageMap["demo_completed"] || 0) +
      (stageMap["proposal_sent"] || 0) + (stageMap["negotiating"] || 0) +
      (stageMap["closed_won"] || 0) + (stageMap["closed_lost"] || 0);

    const closed = stageMap["closed_won"] || 0;

    funnels.push({
      vertical,
      totalLeads: total,
      contacted,
      responded,
      discoveryBooked,
      closed,
      contactToResponseRate: contacted > 0 ? Math.round((responded / contacted) * 1000) / 10 : 0,
      responseToBookingRate: responded > 0 ? Math.round((discoveryBooked / responded) * 1000) / 10 : 0,
    });
  }

  return funnels;
}

// ─── Template Performance ───────────────────────────────────────────────────

export interface TemplatePerformance {
  templateId: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export async function getTemplatePerformance(): Promise<TemplatePerformance[]> {
  await getDb();

  const templates = ["A", "B", "C", "D", "E", "F"];
  const performance: TemplatePerformance[] = [];

  for (const templateId of templates) {
    const [sent] = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachMessages)
      .where(and(
        eq(outreachMessages.templateId, templateId),
        eq(outreachMessages.status, "sent"),
      ));

    const [opened] = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachMessages)
      .where(and(
        eq(outreachMessages.templateId, templateId),
        sql`${outreachMessages.openedAt} IS NOT NULL`,
      ));

    const [clicked] = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachMessages)
      .where(and(
        eq(outreachMessages.templateId, templateId),
        sql`${outreachMessages.clickedAt} IS NOT NULL`,
      ));

    const [replied] = await db
      .select({ count: sql<number>`count(*)` })
      .from(outreachMessages)
      .where(and(
        eq(outreachMessages.templateId, templateId),
        sql`${outreachMessages.repliedAt} IS NOT NULL`,
      ));

    const sentCount = sent.count || 0;
    performance.push({
      templateId,
      sent: sentCount,
      opened: opened.count,
      clicked: clicked.count,
      replied: replied.count,
      openRate: sentCount > 0 ? Math.round((opened.count / sentCount) * 1000) / 10 : 0,
      clickRate: sentCount > 0 ? Math.round((clicked.count / sentCount) * 1000) / 10 : 0,
      replyRate: sentCount > 0 ? Math.round((replied.count / sentCount) * 1000) / 10 : 0,
    });
  }

  return performance;
}

// ─── Daily Action List ──────────────────────────────────────────────────────

export interface ActionItem {
  priority: number; // 1 = highest
  leadId: number;
  companyName: string;
  stage: string;
  action: string;
  reason: string;
  urgency: "critical" | "high" | "medium" | "low";
}

export async function generateDailyActionList(): Promise<ActionItem[]> {
  await getDb();
  const actions: ActionItem[] = [];

  // 1. Proposals overdue (demo_completed without proposal)
  const demoLeads = await db
    .select({ id: leads.id, companyName: leads.companyName, updatedAt: leads.updatedAt })
    .from(leads)
    .where(eq(leads.pipelineStage, "demo_completed"));

  for (const lead of demoLeads) {
    const daysAgo = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
    if (daysAgo >= 1) {
      actions.push({
        priority: 1,
        leadId: lead.id,
        companyName: lead.companyName,
        stage: "demo_completed",
        action: "Send proposal",
        reason: `Demo was ${daysAgo} day(s) ago — proposals sent within 24h close 3X faster`,
        urgency: daysAgo >= 2 ? "critical" : "high",
      });
    }
  }

  // 2. Responded but no discovery booked
  const respondedLeads = await db
    .select({ id: leads.id, companyName: leads.companyName, updatedAt: leads.updatedAt })
    .from(leads)
    .where(eq(leads.pipelineStage, "responded"));

  for (const lead of respondedLeads) {
    const daysAgo = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
    actions.push({
      priority: 2,
      leadId: lead.id,
      companyName: lead.companyName,
      stage: "responded",
      action: "Book discovery call",
      reason: daysAgo > 2
        ? `Responded ${daysAgo} days ago — momentum fading, book NOW`
        : "Hot lead responded — book within 24 hours",
      urgency: daysAgo > 3 ? "critical" : "high",
    });
  }

  // 3. Stale prospects that need re-engagement
  const { staleLeads } = await detectStaleProspects();
  for (const stale of staleLeads) {
    actions.push({
      priority: 3,
      leadId: stale.id,
      companyName: stale.companyName,
      stage: stale.stage,
      action: stale.recommendedAction,
      reason: `${stale.daysSinceActivity} days without activity`,
      urgency: stale.daysSinceActivity > 10 ? "high" : "medium",
    });
  }

  // 4. Drafted messages awaiting approval
  const [draftCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(outreachMessages)
    .where(eq(outreachMessages.status, "draft"));

  if (draftCount.count > 0) {
    actions.push({
      priority: 4,
      leadId: 0,
      companyName: "(Batch)",
      stage: "outreach",
      action: `Review and approve ${draftCount.count} draft messages`,
      reason: "Messages generated overnight — approve to send during optimal window",
      urgency: "medium",
    });
  }

  // Sort by priority, then urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return actions;
}

// ─── Weekly Pacing ──────────────────────────────────────────────────────────

export interface WeeklyPacing {
  discoveryCallsBooked: number;
  target: number;
  onTrack: boolean;
  pace: string;
  daysLeftInWeek: number;
  callsNeeded: number;
}

export async function getWeeklyPacing(): Promise<WeeklyPacing> {
  await getDb();

  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString().split("T")[0];

  // Count discovery_booked events this week
  const [booked] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pipelineEvents)
    .where(and(
      eq(pipelineEvents.toStage, "discovery_booked"),
      sql`date(${pipelineEvents.createdAt}) >= ${mondayStr}`,
    ));

  const callsBooked = booked.count;
  const daysLeft = Math.max(0, 5 - (dayOfWeek === 0 ? 5 : dayOfWeek - 1));
  const callsNeeded = Math.max(0, WEEKLY_CALL_TARGET - callsBooked);

  let pace: string;
  if (callsBooked >= WEEKLY_CALL_TARGET) {
    pace = "Target met — maintain momentum";
  } else if (daysLeft === 0) {
    pace = `Missed target: ${callsBooked}/${WEEKLY_CALL_TARGET} calls booked`;
  } else {
    const rate = callsNeeded / daysLeft;
    pace = rate <= 1
      ? `On track — need ${callsNeeded} more call(s) over ${daysLeft} day(s)`
      : `Behind pace — need ${callsNeeded} calls in ${daysLeft} day(s), increase outreach`;
  }

  return {
    discoveryCallsBooked: callsBooked,
    target: WEEKLY_CALL_TARGET,
    onTrack: callsBooked >= WEEKLY_CALL_TARGET || (callsNeeded / Math.max(daysLeft, 1)) <= 1,
    pace,
    daysLeftInWeek: daysLeft,
    callsNeeded,
  };
}

// ─── Pipeline Stats ──────────────────────────────────────────────────────────
export async function getPipelineStats(): Promise<DashboardStats> {
  await getDb();
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
  await getDb();
  const stats = await getPipelineStats();
  const { staleLeads } = await detectStaleProspects();
  const pacing = await getWeeklyPacing();
  const actionList = await generateDailyActionList();

  const lines: string[] = [
    `DAILY BRIEFING — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    "",
    `WEEKLY TARGET: ${pacing.discoveryCallsBooked}/${pacing.target} discovery calls`,
    `Status: ${pacing.pace}`,
    "",
  ];

  // Top actions
  if (actionList.length > 0) {
    lines.push(`TODAY'S ACTIONS (${actionList.length} items):`);
    for (const item of actionList.slice(0, 8)) {
      const urgencyTag = item.urgency === "critical" ? "[!!!]"
        : item.urgency === "high" ? "[!!]"
        : item.urgency === "medium" ? "[!]" : "";
      lines.push(`  ${urgencyTag} ${item.companyName}: ${item.action}`);
      lines.push(`      → ${item.reason}`);
    }
    lines.push("");
  }

  if (staleLeads.length > 0) {
    lines.push(`STALE PROSPECTS (${staleLeads.length}):`);
    for (const lead of staleLeads.slice(0, 5)) {
      lines.push(`  - ${lead.companyName} (${lead.stage}, ${lead.daysSinceActivity}d): ${lead.recommendedAction}`);
    }
    lines.push("");
  }

  lines.push(`PIPELINE SNAPSHOT`);
  lines.push(`  Active prospects: ${stats.activeProspects}`);
  lines.push(`  New leads today: ${stats.newLeadsToday}`);
  lines.push(`  Response rate: ${stats.responseRate}%`);
  lines.push(`  Messages queued: ${stats.messagesQueuedToday}`);

  return lines.join("\n");
}

// ─── Evening Report Generator ────────────────────────────────────────────────
export async function generateEveningReport(): Promise<string> {
  await getDb();
  const stats = await getPipelineStats();
  const pacing = await getWeeklyPacing();
  const templatePerf = await getTemplatePerformance();

  const lines: string[] = [
    `EVENING REPORT — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    "",
    `TODAY'S RESULTS`,
    `  Messages sent: ${stats.messagesSentToday} (target: 20)`,
    `  Responses received: ${stats.responsesToday}`,
    `  Discovery calls this week: ${pacing.discoveryCallsBooked}/${pacing.target}`,
    "",
  ];

  // Template performance
  const activeTemplates = templatePerf.filter(t => t.sent > 0);
  if (activeTemplates.length > 0) {
    lines.push(`TEMPLATE PERFORMANCE:`);
    for (const t of activeTemplates) {
      lines.push(`  ${t.templateId}: ${t.sent} sent → ${t.openRate}% open, ${t.replyRate}% reply`);
    }
    lines.push("");
  }

  // Gaps
  lines.push(`GAPS:`);
  if (stats.messagesSentToday < 20) {
    lines.push(`  - Only ${stats.messagesSentToday}/20 messages sent today`);
  }
  if (stats.staleProspects > 0) {
    lines.push(`  - ${stats.staleProspects} prospects still stale`);
  }
  if (!pacing.onTrack) {
    lines.push(`  - Behind on weekly call target: ${pacing.pace}`);
  }

  lines.push("");
  lines.push(`TOMORROW'S SETUP`);
  lines.push(`  ${stats.messagesQueuedToday} messages pre-drafted for morning outreach`);

  return lines.join("\n");
}
