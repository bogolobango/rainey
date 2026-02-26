import { NextResponse } from "next/server";
import { db, getDb } from "@/lib/db";
import { callPreps, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    await getDb();
    const results = await db
      .select({
        id: callPreps.id,
        leadId: callPreps.leadId,
        callDate: callPreps.callDate,
        companySnapshot: callPreps.companySnapshot,
        painSignals: callPreps.painSignals,
        financialModel: callPreps.financialModel,
        killerQuestions: callPreps.killerQuestions,
        objectionHandles: callPreps.objectionHandles,
        recommendedCaseStudy: callPreps.recommendedCaseStudy,
        competitiveIntel: callPreps.competitiveIntel,
        createdAt: callPreps.createdAt,
        companyName: leads.companyName,
        contactFirst: leads.firstName,
        contactLast: leads.lastName,
        vertical: leads.vertical,
        locationCount: leads.locationCount,
      })
      .from(callPreps)
      .leftJoin(leads, eq(callPreps.leadId, leads.id))
      .orderBy(desc(callPreps.callDate))
      .limit(20);

    return NextResponse.json({ callPreps: results });
  } catch (error) {
    console.error("Failed to fetch research:", error);
    return NextResponse.json({ error: "Failed to fetch research" }, { status: 500 });
  }
}
