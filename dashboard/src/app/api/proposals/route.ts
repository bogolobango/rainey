import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const results = await db
      .select({
        id: proposals.id,
        leadId: proposals.leadId,
        executiveSummary: proposals.executiveSummary,
        pricing: proposals.pricing,
        status: proposals.status,
        createdAt: proposals.createdAt,
        companyName: leads.companyName,
        contactFirst: leads.firstName,
        contactLast: leads.lastName,
        locationCount: leads.locationCount,
        vertical: leads.vertical,
      })
      .from(proposals)
      .leftJoin(leads, eq(proposals.leadId, leads.id))
      .orderBy(desc(proposals.createdAt))
      .limit(50);

    return NextResponse.json({ proposals: results });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
