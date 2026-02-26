import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pipelineEvents, leads, agentRuns } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
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
