import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { AgentType } from "@/types";

// GET /api/agents — Returns status of all agents
export async function GET() {
  try {
    // Get latest run for each agent type
    const agentTypes: AgentType[] = [
      "lead_scout",
      "outreach_composer",
      "pipeline_intelligence",
      "prospect_research",
      "follow_up_sequencing",
      "proposal_generator",
    ];

    const latestRuns = await Promise.all(
      agentTypes.map(async (type) => {
        const runs = await db
          .select()
          .from(agentRuns)
          .where(eq(agentRuns.agentType, type))
          .orderBy(desc(agentRuns.startedAt))
          .limit(1);
        return {
          agentType: type,
          latestRun: runs[0] || null,
        };
      })
    );

    return NextResponse.json({ agents: latestRuns });
  } catch (error) {
    console.error("Failed to fetch agent status:", error);
    return NextResponse.json({ error: "Failed to fetch agent status" }, { status: 500 });
  }
}

// POST /api/agents — Trigger an agent run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType } = body;

    // Create a new run record
    const run = await db.insert(agentRuns).values({
      agentType,
      status: "running",
    }).returning();

    // In a real implementation, this would trigger the actual agent
    // For now, we just record the run
    // TODO: Implement agent execution via background job queue

    return NextResponse.json({ run: run[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to trigger agent:", error);
    return NextResponse.json({ error: "Failed to trigger agent" }, { status: 500 });
  }
}
