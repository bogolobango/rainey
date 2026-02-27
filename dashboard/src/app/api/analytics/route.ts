import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getPipelineVelocity,
  getVerticalFunnels,
  getTemplatePerformance,
  generateDailyActionList,
  getWeeklyPacing,
} from "@/lib/agents/pipeline-intelligence";
import { generatePreOutreachBrief } from "@/lib/agents/prospect-research";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Lead } from "@/types";

function hydrateLead(row: Record<string, unknown>): Lead {
  return {
    ...row,
    painSignals: row.painSignals ? JSON.parse(row.painSignals as string) : [],
    scoreBreakdown: row.scoreBreakdown ? JSON.parse(row.scoreBreakdown as string) : null,
  } as Lead;
}

/**
 * GET /api/analytics?view=<view>
 *
 * Views:
 *   velocity        — Pipeline velocity (avg days per stage, conversion rates)
 *   funnels         — Conversion funnels by vertical
 *   templates       — Template performance (open/click/reply rates)
 *   actions         — Prioritized daily action list
 *   pacing          — Weekly pacing toward 3 calls/week target
 *   all             — Everything combined
 *   pre-outreach    — Pre-outreach brief for a specific lead (?leadId=N)
 */
export async function GET(request: NextRequest) {
  try {
    await getDb();
    const view = request.nextUrl.searchParams.get("view") || "all";

    if (view === "pre-outreach") {
      const leadId = request.nextUrl.searchParams.get("leadId");
      if (!leadId) {
        return NextResponse.json({ error: "leadId required for pre-outreach view" }, { status: 400 });
      }
      const [lead] = await db.select().from(leads).where(eq(leads.id, parseInt(leadId, 10))).limit(1);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      const brief = generatePreOutreachBrief(hydrateLead(lead as Record<string, unknown>));
      return NextResponse.json({ leadId: lead.id, company: lead.companyName, brief });
    }

    // Fetch requested views
    const result: Record<string, unknown> = {};

    if (view === "all" || view === "velocity") {
      result.velocity = await getPipelineVelocity();
    }
    if (view === "all" || view === "funnels") {
      result.funnels = await getVerticalFunnels();
    }
    if (view === "all" || view === "templates") {
      result.templates = await getTemplatePerformance();
    }
    if (view === "all" || view === "actions") {
      result.actions = await generateDailyActionList();
    }
    if (view === "all" || view === "pacing") {
      result.pacing = await getWeeklyPacing();
    }

    if (Object.keys(result).length === 0) {
      return NextResponse.json(
        { error: `Unknown view: ${view}. Use: velocity, funnels, templates, actions, pacing, all, pre-outreach` },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
