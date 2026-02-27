import { NextRequest, NextResponse } from "next/server";
import { isApolloConfigured, searchSequences, getAllSequenceContacts } from "@/lib/integrations/apollo";
import { mapContactToLead } from "@/lib/apollo-mapper";
import { db, getDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { and, desc, eq, like, sql, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vertical = searchParams.get("vertical");
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    // ── Apollo path (live data) ──────────────────────────────────────────
    if (isApolloConfigured()) {
      const sequences = await searchSequences({ activeOnly: true });
      const sequenceIds = sequences.map(s => s.id);
      const contacts = sequenceIds.length > 0
        ? await getAllSequenceContacts(sequenceIds)
        : [];

      let mapped = contacts.map((c, i) => mapContactToLead(c, i));

      // Apply filters
      if (stage) mapped = mapped.filter(l => l.pipelineStage === stage);
      if (search) {
        const q = search.toLowerCase();
        mapped = mapped.filter(l =>
          l.companyName.toLowerCase().includes(q)
          || (l.firstName ?? "").toLowerCase().includes(q)
          || (l.lastName ?? "").toLowerCase().includes(q)
          || (l.email ?? "").toLowerCase().includes(q),
        );
      }

      const total = mapped.length;
      const paged = mapped.slice(offset, offset + limit);

      return NextResponse.json({ leads: paged, total, limit, offset });
    }

    // ── SQLite fallback ──────────────────────────────────────────────────
    await getDb();
    const conditions: SQL[] = [];
    if (vertical) conditions.push(eq(leads.vertical, vertical));
    if (stage) conditions.push(eq(leads.pipelineStage, stage));
    if (search) conditions.push(like(leads.companyName, `%${search}%`));

    const results = await db
      .select()
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
    await getDb();
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
