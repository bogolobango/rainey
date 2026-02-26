/**
 * Agent schedule constants — shared between server and client code.
 *
 * Extracted from orchestrator.ts so that client components can import
 * schedule data without pulling in server-only agent modules.
 */

import type { AgentType } from "@/types";

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
