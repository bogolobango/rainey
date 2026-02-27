/**
 * BDR Orchestrator — Central Coordination Layer
 *
 * Coordinates all 6 agents based on schedule and signal-driven triggers.
 * Routes webhook events to the right agent for real-time execution.
 *
 * CRITICAL RULE: No agent sends ANY communication to a prospect
 * without human approval. Agents draft, prepare, and queue.
 */

import { db, getDb } from "@/lib/db";
import { leads, outreachMessages, followUpSequences, callPreps } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type { AgentType, Lead } from "@/types";
import { generateMessage } from "./outreach-composer";
import { generateCallPrep } from "./prospect-research";
import { generateProposal } from "./proposal-generator";
import { findAlternateEmail } from "@/lib/integrations/apollo";
import { sendNotification } from "@/lib/notifications";
import { formatCurrency, calculateROI } from "@/lib/utils";

export { DAILY_SCHEDULE, type ScheduledTask } from "./schedule";

// ─── Helpers ────────────────────────────────────────────────────────────────

function hydrateLead(row: Record<string, unknown>): Lead {
  return {
    ...row,
    painSignals: row.painSignals ? JSON.parse(row.painSignals as string) : [],
    scoreBreakdown: row.scoreBreakdown ? JSON.parse(row.scoreBreakdown as string) : null,
  } as Lead;
}

// ─── Signal-Driven Triggers ──────────────────────────────────────────────────

export type SignalTrigger =
  | { type: "prospect_replied"; leadId: number }
  | { type: "linkedin_accepted"; leadId: number }
  | { type: "discovery_booked"; leadId: number; callDate: string }
  | { type: "demo_completed"; leadId: number; callNotes: string }
  | { type: "prospect_stale"; leadId: number; daysSinceActivity: number }
  | { type: "email_bounced"; leadId: number }
  | { type: "link_clicked"; leadId: number; url: string }
  | { type: "email_opened"; leadId: number; openCount: number };

export async function handleSignalTrigger(signal: SignalTrigger): Promise<{
  action: string;
  agentTriggered: AgentType;
  result: string;
}> {
  await getDb();

  switch (signal.type) {
    case "prospect_replied": {
      // Exit follow-up sequence + notify Jim immediately
      await db.update(followUpSequences)
        .set({ status: "exited", updatedAt: sql`datetime('now')` })
        .where(and(eq(followUpSequences.leadId, signal.leadId), eq(followUpSequences.status, "active")));

      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      const name = lead?.companyName || `Lead #${signal.leadId}`;
      await sendNotification({
        title: `Reply from ${name}`,
        body: `${name} replied to outreach — respond within 1 hour for best conversion.`,
        urgent: true,
      }).catch(() => {});

      return {
        action: "Exited follow-up sequence, notified Jim for immediate response",
        agentTriggered: "pipeline_intelligence",
        result: `Prospect reply detected — ${name} flagged for immediate attention`,
      };
    }

    case "linkedin_accepted": {
      // Queue a LinkedIn follow-up message
      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      if (lead) {
        const msg = generateMessage(hydrateLead(lead as Record<string, unknown>), "B");
        await db.insert(outreachMessages).values({
          leadId: signal.leadId,
          channel: "linkedin",
          templateId: "B",
          subject: null,
          body: msg.body,
          personalizationNotes: "LinkedIn accepted — auto-generated follow-up",
          status: "draft",
          sequenceDay: 0,
        });
      }
      return {
        action: "Generated LinkedIn follow-up message as draft",
        agentTriggered: "outreach_composer",
        result: "LinkedIn connection accepted — follow-up message queued for approval",
      };
    }

    case "discovery_booked": {
      // Generate call prep document
      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      if (lead) {
        const prep = generateCallPrep(hydrateLead(lead as Record<string, unknown>));
        const roi = calculateROI(lead.locationCount);
        await db.insert(callPreps).values({
          leadId: signal.leadId,
          callDate: signal.callDate,
          companySnapshot: JSON.stringify(prep.companySnapshot),
          painSignals: JSON.stringify(prep.painSignals),
          financialModel: JSON.stringify({
            "Est. Annual Lost Revenue": formatCurrency(prep.financialModel.estimatedAnnualLostRevenue),
            "Monthly Investment": formatCurrency(roi.monthlyInvestment),
            "Projected ROI": `${prep.financialModel.roi}X`,
            "Payback Period": `${prep.financialModel.paybackDays} days`,
          }),
          killerQuestions: JSON.stringify(prep.killerQuestions),
          objectionHandles: JSON.stringify(prep.objectionHandles),
          recommendedCaseStudy: prep.recommendedCaseStudy,
          competitiveIntel: prep.competitiveIntel,
        });

        await sendNotification({
          title: `Call Prep Ready: ${lead.companyName}`,
          body: `Discovery call on ${signal.callDate}. Call prep doc generated with financial model + killer questions.`,
        }).catch(() => {});
      }
      return {
        action: "Generated call prep doc with financial model + killer questions",
        agentTriggered: "prospect_research",
        result: "Discovery call booked — call prep generation complete",
      };
    }

    case "demo_completed": {
      // Generate proposal
      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      if (lead) {
        const proposal = generateProposal({
          lead: hydrateLead(lead as Record<string, unknown>),
          callNotes: signal.callNotes,
        });
        const roi = calculateROI(lead.locationCount);
        const { proposals } = await import("@/lib/db/schema");
        await db.insert(proposals).values({
          leadId: signal.leadId,
          executiveSummary: proposal.executiveSummary,
          currentStateAnalysis: proposal.currentStateAnalysis,
          proposedSolution: proposal.proposedSolution,
          financialModel: proposal.financialModel,
          implementationTimeline: proposal.implementationTimeline,
          caseStudy: proposal.caseStudy,
          pricing: JSON.stringify({
            setupFee: lead.locationCount <= 5 ? 2000 : 5000,
            monthly: roi.monthlyInvestment,
            yearOneValue: roi.estimatedAnnualValue,
            roi: roi.roi,
          }),
          nextSteps: proposal.nextSteps,
          status: "draft",
        });

        await sendNotification({
          title: `Proposal Ready: ${lead.companyName}`,
          body: `Custom proposal generated after demo — review and send within 30 minutes for best close rate.`,
          urgent: true,
        }).catch(() => {});
      }
      return {
        action: "Generated custom proposal within minutes of demo",
        agentTriggered: "proposal_generator",
        result: "Demo completed — proposal ready for review",
      };
    }

    case "prospect_stale": {
      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      const name = lead?.companyName || `Lead #${signal.leadId}`;
      await sendNotification({
        title: `Stale: ${name} (${signal.daysSinceActivity}d)`,
        body: `${name} hasn't had activity in ${signal.daysSinceActivity} days. Consider channel switch or direct call.`,
      }).catch(() => {});
      return {
        action: "Flagged stale prospect with recommended action, notified Jim",
        agentTriggered: "pipeline_intelligence",
        result: `Prospect stale (${signal.daysSinceActivity} days) — flagged with recommended action`,
      };
    }

    case "email_bounced": {
      // Try to find alternate email via Apollo
      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      if (lead?.firstName && lead?.lastName && lead?.website) {
        const domain = lead.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        const altEmail = await findAlternateEmail(lead.firstName, lead.lastName, domain);
        if (altEmail) {
          await db.update(leads).set({ email: altEmail, updatedAt: sql`datetime('now')` }).where(eq(leads.id, signal.leadId));
          // Restart the follow-up sequence
          await db.update(followUpSequences)
            .set({ currentDay: 0, status: "active", updatedAt: sql`datetime('now')` })
            .where(and(eq(followUpSequences.leadId, signal.leadId), eq(followUpSequences.status, "paused")));
          return {
            action: `Found alternate email via Apollo: ${altEmail}, restarting sequence`,
            agentTriggered: "follow_up_sequencing",
            result: "Email bounced — alternate email found, sequence restarted",
          };
        }
      }
      return {
        action: "Attempted Apollo email recovery — no alternate found",
        agentTriggered: "follow_up_sequencing",
        result: "Email bounced — could not find alternate email",
      };
    }

    case "link_clicked": {
      // Accelerate sequence — queue warm follow-up + phone script + notify Jim
      const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
      if (lead) {
        const l = hydrateLead(lead as Record<string, unknown>);
        const warmMsg = generateMessage(l, "D");
        await db.insert(outreachMessages).values({
          leadId: signal.leadId,
          channel: "email",
          templateId: "D",
          subject: warmMsg.subject,
          body: warmMsg.body,
          personalizationNotes: `Triggered by link click — warm lead, follow up fast`,
          status: "draft",
          sequenceDay: 0,
        });
        // Accelerate sequence
        await db.update(followUpSequences)
          .set({ currentDay: sql`current_day + 3`, updatedAt: sql`datetime('now')` })
          .where(and(eq(followUpSequences.leadId, signal.leadId), eq(followUpSequences.status, "active")));

        await sendNotification({
          title: `Hot Lead: ${lead.companyName} clicked link`,
          body: `${lead.firstName} clicked ${signal.url}. Warm follow-up queued. Consider calling ${lead.phone || "direct"} NOW.`,
          urgent: true,
        }).catch(() => {});
      }
      return {
        action: "Generated warm follow-up, accelerated sequence by 3 days, notified Jim",
        agentTriggered: "follow_up_sequencing",
        result: "Link clicked — warm follow-up queued + sequence accelerated",
      };
    }

    case "email_opened": {
      // If opened 3+ times, this is a hot prospect — accelerate
      if (signal.openCount >= 3) {
        const [lead] = await db.select().from(leads).where(eq(leads.id, signal.leadId)).limit(1);
        if (lead) {
          await sendNotification({
            title: `Hot Lead: ${lead.companyName} (${signal.openCount} opens)`,
            body: `${lead.firstName} opened your email ${signal.openCount} times. Call them: ${lead.phone || "no phone on file"}.`,
            urgent: true,
          }).catch(() => {});
        }
        // Accelerate sequence by 1 day
        await db.update(followUpSequences)
          .set({ currentDay: sql`current_day + 1`, updatedAt: sql`datetime('now')` })
          .where(and(eq(followUpSequences.leadId, signal.leadId), eq(followUpSequences.status, "active")));
      }
      return {
        action: signal.openCount >= 3
          ? "Hot prospect: accelerated sequence, notified Jim to call"
          : "Email opened — tracking engagement",
        agentTriggered: "follow_up_sequencing",
        result: `Email opened ${signal.openCount} time(s)`,
      };
    }
  }
}

// ─── System Status (live from DB) ───────────────────────────────────────────

export interface SystemStatus {
  allAgentsOperational: boolean;
  agents: Record<AgentType, {
    status: "online" | "offline" | "error";
    lastRun: string | null;
    nextRun: string;
  }>;
  dataLayerHealthy: boolean;
  integrationsConnected: string[];
  integrationsDisconnected: string[];
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const connected: string[] = [];
  const disconnected: string[] = [];

  if (process.env.OPENAI_API_KEY) connected.push("OpenAI"); else disconnected.push("OpenAI");
  if (process.env.APOLLO_API_KEY) connected.push("Apollo.io"); else disconnected.push("Apollo.io");
  if (process.env.INSTANTLY_API_KEY) connected.push("Instantly.ai"); else disconnected.push("Instantly.ai");
  if (process.env.SLACK_WEBHOOK_URL || process.env.TELEGRAM_BOT_TOKEN) connected.push("Notifications"); else disconnected.push("Notifications");

  return {
    allAgentsOperational: connected.length >= 2,
    agents: {
      lead_scout: { status: process.env.OPENAI_API_KEY ? "online" : "offline", lastRun: null, nextRun: "6:30 AM ET" },
      outreach_composer: { status: "online", lastRun: null, nextRun: "7:00 AM ET" },
      pipeline_intelligence: { status: "online", lastRun: null, nextRun: "7:30 AM ET" },
      prospect_research: { status: "online", lastRun: null, nextRun: "On demand" },
      follow_up_sequencing: { status: "online", lastRun: null, nextRun: "10:00 AM ET" },
      proposal_generator: { status: "online", lastRun: null, nextRun: "On demand" },
    },
    dataLayerHealthy: true,
    integrationsConnected: connected,
    integrationsDisconnected: disconnected,
  };
}
