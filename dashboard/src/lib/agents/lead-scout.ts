/**
 * Agent 1: Lead Scout (Discovery & Enrichment)
 *
 * Trigger: Daily at 6:30 AM ET
 * Purpose: Ensure 50+ fresh, qualified, enriched leads ready for outreach every morning.
 *
 * Workflow:
 * 1. Query Google Maps API for businesses matching ICP criteria
 * 2. Filter by location count (3+), vertical match, operational signals
 * 3. Cross-reference against existing leads to deduplicate
 * 4. Enrich with company + decision-maker data
 * 5. Score each lead (1-10) using weighted ICP criteria
 * 6. Output enriched, scored leads to database
 */

import { db } from "@/lib/db";
import { leads, agentRuns } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Vertical, Tier } from "@/types";

// ─── Scoring Weights ─────────────────────────────────────────────────────────
const SCORING_WEIGHTS = {
  locationCount: 0.30,
  verticalMatch: 0.20,
  painSignalStrength: 0.25,
  decisionMakerAccess: 0.15,
  geographicProximity: 0.10,
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface DiscoveredLead {
  companyName: string;
  website: string | null;
  vertical: Vertical;
  locationCount: number;
  locationCitiesStates: string;
  bookingPlatform: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  annualRevenue: string | null;
  employeeCount: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinCompany: string | null;
  linkedinPersonal: string | null;
  painSignals: string[];
  research: string | null;
}

// ─── Scoring Logic ───────────────────────────────────────────────────────────
export function scoreLead(lead: DiscoveredLead): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // Location count score (3-5 = 6-7, 6-10 = 8-9, 10+ = 10)
  if (lead.locationCount >= 10) breakdown.locationCount = 10;
  else if (lead.locationCount >= 6) breakdown.locationCount = 8 + (lead.locationCount - 6) * 0.5;
  else if (lead.locationCount >= 3) breakdown.locationCount = 6 + (lead.locationCount - 3) * 0.5;
  else breakdown.locationCount = lead.locationCount * 2;

  // Vertical match (primary = 10, secondary = 7, tertiary = 5)
  if (lead.vertical === "indoor_sports") breakdown.verticalMatch = 10;
  else if (lead.vertical === "med_spa") breakdown.verticalMatch = 7;
  else if (lead.vertical === "dental") breakdown.verticalMatch = 5;
  else breakdown.verticalMatch = 4;

  // Pain signal strength
  const signalCount = lead.painSignals?.length || 0;
  breakdown.painSignalStrength = Math.min(signalCount * 2.5, 10);

  // Decision-maker accessibility
  let dmScore = 0;
  if (lead.email) dmScore += 4;
  if (lead.linkedinPersonal) dmScore += 3;
  if (lead.phone) dmScore += 2;
  if (lead.firstName && lead.lastName) dmScore += 1;
  breakdown.decisionMakerAccess = Math.min(dmScore, 10);

  // Geographic proximity (NYC metro = 10, tristate = 8, secondary markets = 6, other = 4)
  const location = (lead.locationCitiesStates || "").toLowerCase();
  if (location.includes("nyc") || location.includes("manhattan") || location.includes("brooklyn") || location.includes("queens"))
    breakdown.geographicProximity = 10;
  else if (location.includes("ny") || location.includes("nj") || location.includes("ct"))
    breakdown.geographicProximity = 8;
  else if (location.includes("philadelphia") || location.includes("seattle") || location.includes("boston"))
    breakdown.geographicProximity = 6;
  else breakdown.geographicProximity = 4;

  // Weighted total
  const score = Math.round(
    (breakdown.locationCount * SCORING_WEIGHTS.locationCount +
      breakdown.verticalMatch * SCORING_WEIGHTS.verticalMatch +
      breakdown.painSignalStrength * SCORING_WEIGHTS.painSignalStrength +
      breakdown.decisionMakerAccess * SCORING_WEIGHTS.decisionMakerAccess +
      breakdown.geographicProximity * SCORING_WEIGHTS.geographicProximity) * 10
  ) / 10;

  return { score, breakdown };
}

// ─── Tier Classification ─────────────────────────────────────────────────────
export function classifyTier(lead: DiscoveredLead): Tier {
  if (lead.locationCount >= 6) return "tier_2";
  return "tier_1";
}

// ─── Main Agent Runner ───────────────────────────────────────────────────────
export async function runLeadScout(): Promise<{
  success: boolean;
  leadsDiscovered: number;
  leadsEnriched: number;
  duplicatesSkipped: number;
  summary: string;
}> {
  // Create agent run record
  const [run] = await db.insert(agentRuns).values({
    agentType: "lead_scout",
    status: "running",
  }).returning();

  try {
    // TODO: Phase 1 — Use OpenAI (existing rainey.py logic, ported to TS)
    // TODO: Phase 2 — Add Google Maps API discovery
    // TODO: Phase 3 — Add Apollo.io enrichment
    // TODO: Phase 4 — Add deduplication against existing DB leads

    // For now, return placeholder
    const result = {
      success: true,
      leadsDiscovered: 0,
      leadsEnriched: 0,
      duplicatesSkipped: 0,
      summary: "Lead Scout agent skeleton initialized. Awaiting API integrations.",
    };

    // Update run record
    await db
      .update(agentRuns)
      .set({
        status: "completed",
        completedAt: sql`datetime('now')`,
        itemsProcessed: result.leadsDiscovered,
        summary: result.summary,
      })
      .where(eq(agentRuns.id, run.id));

    return result;
  } catch (error) {
    await db
      .update(agentRuns)
      .set({
        status: "failed",
        completedAt: sql`datetime('now')`,
        errorLog: String(error),
      })
      .where(eq(agentRuns.id, run.id));

    return {
      success: false,
      leadsDiscovered: 0,
      leadsEnriched: 0,
      duplicatesSkipped: 0,
      summary: `Lead Scout failed: ${error}`,
    };
  }
}
