import { NextRequest, NextResponse } from "next/server";
import { db, getDb } from "@/lib/db";
import { leads, pipelineEvents } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/pipeline — Returns pipeline stats and stage counts
export async function GET() {
  try {
    await getDb();
    const stageCounts = await db
      .select({
        stage: leads.pipelineStage,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .groupBy(leads.pipelineStage);

    const totalLeads = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);

    const recentEvents = await db
      .select()
      .from(pipelineEvents)
      .orderBy(sql`created_at DESC`)
      .limit(20);

    return NextResponse.json({
      stageCounts: Object.fromEntries(stageCounts.map(s => [s.stage, s.count])),
      totalLeads: totalLeads[0].count,
      recentEvents,
    });
  } catch (error) {
    console.error("Failed to fetch pipeline data:", error);
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

// POST /api/pipeline — Move a prospect to a new stage
export async function POST(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { leadId, toStage, trigger, notes } = body;

    // Get current stage
    const current = await db
      .select({ stage: leads.pipelineStage })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (current.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const fromStage = current[0].stage;

    // Update lead stage
    await db
      .update(leads)
      .set({ pipelineStage: toStage, updatedAt: sql`datetime('now')` })
      .where(eq(leads.id, leadId));

    // Create pipeline event
    const event = await db.insert(pipelineEvents).values({
      leadId,
      fromStage,
      toStage,
      trigger: trigger || "manual",
      notes,
    }).returning();

    return NextResponse.json({ event: event[0], fromStage, toStage });
  } catch (error) {
    console.error("Failed to update pipeline:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}
