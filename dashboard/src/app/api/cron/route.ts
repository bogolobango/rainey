/**
 * Vercel Cron Handler — Automated Daily Agent Execution
 *
 * Vercel invokes this endpoint on the schedule defined in vercel.json.
 * Each call receives an "agent" search param telling it which agent to run.
 *
 * Security: Validates CRON_SECRET header to prevent unauthorized triggers.
 *
 * Schedule (all times ET):
 *   6:30 AM  — Lead Scout (discovery + enrichment)
 *   7:00 AM  — Outreach Composer (20 personalized messages)
 *   7:30 AM  — Pipeline Intelligence (morning briefing)
 *  10:00 AM  — Follow-Up Sequencing (queue today's follow-ups)
 *   3:00 PM  — Prospect Research (prep for tomorrow's calls)
 *   5:00 PM  — Pipeline Intelligence (evening report)
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for agent runs

const AGENTS_API_URL = "/api/agents";

export async function GET(request: NextRequest) {
  // ── Verify cron secret ────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Determine which agent to run ──────────────────────────────────────────
  const agentType = request.nextUrl.searchParams.get("agent");

  const validAgents = [
    "lead_scout",
    "outreach_composer",
    "pipeline_intelligence",
    "prospect_research",
    "follow_up_sequencing",
    "proposal_generator",
  ];

  if (!agentType || !validAgents.includes(agentType)) {
    return NextResponse.json(
      { error: `Invalid agent type. Valid: ${validAgents.join(", ")}` },
      { status: 400 },
    );
  }

  // ── Trigger agent via internal API ────────────────────────────────────────
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}${AGENTS_API_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`[Cron] Agent ${agentType} failed:`, result);
      return NextResponse.json(
        { error: `Agent ${agentType} execution failed`, detail: result },
        { status: 500 },
      );
    }

    console.log(`[Cron] Agent ${agentType} completed:`, result.run?.summary);

    return NextResponse.json({
      ok: true,
      agent: agentType,
      runId: result.run?.id,
      summary: result.run?.summary,
      itemsProcessed: result.run?.itemsProcessed,
    });
  } catch (error) {
    console.error(`[Cron] Failed to trigger ${agentType}:`, error);
    return NextResponse.json(
      { error: `Failed to trigger ${agentType}`, detail: String(error) },
      { status: 500 },
    );
  }
}
