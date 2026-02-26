import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { desc, eq, like, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    let query = db.select().from(leads);

    // Build conditions
    const conditions = [];
    if (vertical) conditions.push(eq(leads.vertical, vertical));
    if (stage) conditions.push(eq(leads.pipelineStage, stage));
    if (search) conditions.push(like(leads.companyName, `%${search}%`));

    const results = await db
      .select()
      .from(leads)
      .where(conditions.length > 0 ? sql`${conditions.map(c => c).join(" AND ")}` : undefined)
      .orderBy(desc(leads.score))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);

    return NextResponse.json({
      leads: results,
      total: total[0].count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await db.insert(leads).values({
      companyName: body.companyName,
      website: body.website,
      vertical: body.vertical,
      tier: body.tier || "tier_1",
      locationCount: body.locationCount || 1,
      locationCitiesStates: body.locationCitiesStates,
      bookingPlatform: body.bookingPlatform,
      googleRating: body.googleRating,
      googleReviewCount: body.googleReviewCount,
      annualRevenue: body.annualRevenue,
      employeeCount: body.employeeCount,
      score: body.score || 0,
      scoreBreakdown: body.scoreBreakdown ? JSON.stringify(body.scoreBreakdown) : null,
      firstName: body.firstName,
      lastName: body.lastName,
      title: body.title,
      email: body.email,
      phone: body.phone,
      linkedinCompany: body.linkedinCompany,
      linkedinPersonal: body.linkedinPersonal,
      pipelineStage: body.pipelineStage || "cold",
      painSignals: body.painSignals ? JSON.stringify(body.painSignals) : null,
      research: body.research,
      source: body.source || "manual",
    }).returning();

    return NextResponse.json({ lead: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
