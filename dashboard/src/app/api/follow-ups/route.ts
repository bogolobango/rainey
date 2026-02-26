import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { followUpSequences, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const sequences = await db
      .select({
        id: followUpSequences.id,
        leadId: followUpSequences.leadId,
        currentDay: followUpSequences.currentDay,
        status: followUpSequences.status,
        nextTouchAt: followUpSequences.nextTouchAt,
        channelHistory: followUpSequences.channelHistory,
        pausedUntil: followUpSequences.pausedUntil,
        createdAt: followUpSequences.createdAt,
        updatedAt: followUpSequences.updatedAt,
        companyName: leads.companyName,
        contactFirst: leads.firstName,
        contactLast: leads.lastName,
      })
      .from(followUpSequences)
      .leftJoin(leads, eq(followUpSequences.leadId, leads.id))
      .orderBy(desc(followUpSequences.updatedAt))
      .limit(50);

    return NextResponse.json({ sequences });
  } catch (error) {
    console.error("Failed to fetch follow-ups:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}
