/**
 * BDR Orchestrator — Central Coordination Layer
 *
 * Coordinates all 6 agents based on schedule and signal-driven triggers.
 * Manages the operating cadence defined in the spec.
 *
 * CRITICAL RULE: No agent sends ANY communication to a prospect
 * without human approval. Agents draft, prepare, and queue.
 */

import { runLeadScout } from "./lead-scout";
import { generateOutreachBatch } from "./outreach-composer";
import { generateMorningBriefing, generateEveningReport, detectStaleProspects } from "./pipeline-intelligence";
import { generateCallPrep } from "./prospect-research";
import { buildDailyFollowUpQueue } from "./follow-up-sequencing";
import { generateProposal } from "./proposal-generator";
import type { AgentType } from "@/types";

// ─── Schedule Definition (ET) ────────────────────────────────────────────────
export interface ScheduledTask {
  agentType: AgentType;
  cronExpression: string;
  description: string;
  timeET: string;
}

export const DAILY_SCHEDULE: ScheduledTask[] = [
  { agentType: "lead_scout", cronExpression: "30 6 * * *", description: "Run discovery + enrichment", timeET: "6:30 AM" },
  { agentType: "outreach_composer", cronExpression: "0 7 * * *", description: "Generate 20 personalized messages", timeET: "7:00 AM" },
  { agentType: "pipeline_intelligence", cronExpression: "30 7 * * *", description: "Generate morning briefing", timeET: "7:30 AM" },
  { agentType: "follow_up_sequencing", cronExpression: "0 10 * * *", description: "Queue today's follow-ups", timeET: "10:00 AM" },
  { agentType: "prospect_research", cronExpression: "0 15 * * *", description: "Prep for tomorrow's calls", timeET: "3:00 PM" },
  { agentType: "pipeline_intelligence", cronExpression: "0 17 * * *", description: "Generate evening report", timeET: "5:00 PM" },
];

// ─── Signal-Driven Triggers ──────────────────────────────────────────────────
export type SignalTrigger =
  | { type: "prospect_replied"; leadId: number }
  | { type: "linkedin_accepted"; leadId: number }
  | { type: "discovery_booked"; leadId: number; callDate: string }
  | { type: "demo_completed"; leadId: number; callNotes: string }
  | { type: "prospect_stale"; leadId: number; daysSinceActivity: number }
  | { type: "email_bounced"; leadId: number }
  | { type: "link_clicked"; leadId: number; url: string };

export async function handleSignalTrigger(signal: SignalTrigger): Promise<{
  action: string;
  agentTriggered: AgentType;
  result: string;
}> {
  switch (signal.type) {
    case "prospect_replied":
      return {
        action: "Update pipeline status, flag for Jim, generate suggested response",
        agentTriggered: "pipeline_intelligence",
        result: "Prospect reply detected — flagged for immediate attention",
      };
    case "linkedin_accepted":
      return {
        action: "Generate LinkedIn follow-up message",
        agentTriggered: "outreach_composer",
        result: "LinkedIn connection accepted — follow-up message queued",
      };
    case "discovery_booked":
      return {
        action: "Generate comprehensive call prep doc",
        agentTriggered: "prospect_research",
        result: "Discovery call booked — call prep generation initiated",
      };
    case "demo_completed":
      return {
        action: "Generate custom proposal within 30 minutes",
        agentTriggered: "proposal_generator",
        result: "Demo completed — proposal generation initiated",
      };
    case "prospect_stale":
      return {
        action: "Flag prospect, recommend next action",
        agentTriggered: "pipeline_intelligence",
        result: `Prospect stale (${signal.daysSinceActivity} days) — flagged with recommended action`,
      };
    case "email_bounced":
      return {
        action: "Find alternate email via Apollo, restart sequence",
        agentTriggered: "follow_up_sequencing",
        result: "Email bounced — alternate email search initiated",
      };
    case "link_clicked":
      return {
        action: "Generate warm follow-up, accelerate sequence",
        agentTriggered: "follow_up_sequencing",
        result: "Link clicked — warm follow-up queued within 1 hour",
      };
  }
}

// ─── System Status ───────────────────────────────────────────────────────────
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

export function getSystemStatus(): SystemStatus {
  return {
    allAgentsOperational: true,
    agents: {
      lead_scout: { status: "online", lastRun: null, nextRun: "6:30 AM ET" },
      outreach_composer: { status: "online", lastRun: null, nextRun: "7:00 AM ET" },
      pipeline_intelligence: { status: "online", lastRun: null, nextRun: "7:30 AM ET" },
      prospect_research: { status: "online", lastRun: null, nextRun: "On demand" },
      follow_up_sequencing: { status: "online", lastRun: null, nextRun: "10:00 AM ET" },
      proposal_generator: { status: "online", lastRun: null, nextRun: "On demand" },
    },
    dataLayerHealthy: true,
    integrationsConnected: ["OpenAI", "Telegram"],
    integrationsDisconnected: ["Apollo.io", "Instantly.ai", "Gmail", "Calendar", "Sheets", "Drive", "Maps"],
  };
}
