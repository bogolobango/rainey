/**
 * Agent 1: Lead Scout (Discovery & Enrichment)
 *
 * Ported from rainey.py — GPT-powered lead discovery and enrichment.
 *
 * Trigger: Daily at 6:30 AM ET
 * Workflow:
 * 1. GPT discovers multi-location chains matching ICP criteria
 * 2. GPT enriches each lead with missing contact/revenue data
 * 3. Deduplicate against existing leads in the database
 * 4. Score each lead (1-10) using weighted ICP criteria
 * 5. Insert enriched, scored leads into the database
 */

import { db } from "@/lib/db";
import { leads, agentRuns } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { chatJSON } from "@/lib/integrations/openai";
import type { Vertical, Tier } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TARGET_COUNT = 50;

const CATEGORIES: { label: string; vertical: Vertical; count: number }[] = [
  { label: "indoor sports facility", vertical: "indoor_sports", count: TARGET_COUNT },
  { label: "med spa", vertical: "med_spa", count: TARGET_COUNT },
];

// ─── Scoring Weights ─────────────────────────────────────────────────────────

const SCORING_WEIGHTS = {
  locationCount: 0.30,
  verticalMatch: 0.20,
  painSignalStrength: 0.25,
  decisionMakerAccess: 0.15,
  geographicProximity: 0.10,
};

// ─── Types ───────────────────────────────────────────────────────────────────

/** Raw shape returned by GPT discovery (mirrors rainey.py JSON keys). */
interface GPTDiscoveredLead {
  company_name: string;
  num_locations: number | string;
  location_cities_states: string;
  website: string;
  first_name: string;
  last_name: string;
  role: string;
  business_email: string;
  phone_number: string;
  linkedin_company: string;
  linkedin_personal: string;
  annual_revenue: string;
  size: string;
  research: string;
}

/** Normalised internal lead before DB insert. */
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

// ─── GPT Discovery (ported from rainey.py gpt_discover_leads) ───────────────

async function gptDiscoverLeads(category: string, count: number): Promise<GPTDiscoveredLead[]> {
  const systemPrompt =
    "You are an expert B2B sales researcher specializing in identifying " +
    "multi-location business chains in the NYC metro and tristate area (NY, NJ, CT). " +
    "You have deep knowledge of real operating businesses, their leadership teams, " +
    "company size, revenue, and contact details. " +
    "Return ONLY a valid JSON array — no markdown, no explanation.";

  const userPrompt = `Research and list ${count} real, currently operating multi-location ${category} chains
in the NYC metro / tristate area (New York, New Jersey, Connecticut).
Focus on chains with 2 or more locations. Mix of well-known and lesser-known chains.

For each company, provide as much real, accurate information as you know:

- company_name: Official business name
- num_locations: Number of locations in the tristate area (integer or range like "3-5")
- location_cities_states: Comma-separated list of cities/states where they operate (e.g. "Manhattan NY, Brooklyn NY, Hoboken NJ")
- website: Official website URL
- first_name: First name of the primary decision maker (owner, GM, VP Operations, or founder)
- last_name: Last name of the primary decision maker
- role: Their exact title
- business_email: Their confirmed or most likely professional email (use format like firstname@company.com or info@company.com — only if you have reasonable confidence; otherwise leave blank)
- phone_number: Main business phone number
- linkedin_company: LinkedIn company page URL (e.g. https://www.linkedin.com/company/companyname)
- linkedin_personal: LinkedIn profile URL of the decision maker if known
- annual_revenue: Estimated annual revenue (e.g. "$2M-$5M", "$10M+")
- size: Estimated number of employees (e.g. "10-50", "50-200")
- research: 2-3 sentence summary of what makes them a strong prospect, their growth trajectory, and any relevant intel for a sales rep

Return ONLY a valid JSON array of objects with exactly these keys:
company_name, num_locations, location_cities_states, website, first_name, last_name, role,
business_email, phone_number, linkedin_company, linkedin_personal, annual_revenue, size, research

Do not include any text before or after the JSON array.`;

  return chatJSON<GPTDiscoveredLead[]>({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.5,
    maxTokens: 12000,
  });
}

// ─── GPT Enrichment (ported from rainey.py web_enrich_lead) ─────────────────

async function gptEnrichLead(lead: GPTDiscoveredLead): Promise<GPTDiscoveredLead> {
  const missing: string[] = [];
  if (!lead.business_email) missing.push("business_email");
  if (!lead.phone_number) missing.push("phone_number");
  if (!lead.linkedin_company) missing.push("linkedin_company");
  if (!lead.annual_revenue) missing.push("annual_revenue");
  if (!lead.size) missing.push("size");

  if (missing.length === 0) return lead;

  const enrichPrompt = `You are a B2B sales researcher. Using your knowledge of real businesses,
find the following missing information for this company:

Company: ${lead.company_name}
Website: ${lead.website}
Decision Maker: ${lead.first_name} ${lead.last_name} (${lead.role})
Missing fields: ${missing.join(", ")}

Return ONLY a JSON object with just the missing fields filled in.
For business_email: use the real contact email from their website if known,
  or the decision maker's professional email if known (e.g. john.smith@company.com).
  If truly unknown, use the generic contact email (info@, contact@) or leave blank.
For phone_number: use their real main business phone if known, else leave blank.
For linkedin_company: use https://www.linkedin.com/company/[slug] format.
For annual_revenue: estimate based on number of locations and industry (e.g. "$1M-$3M").
For size: estimate employee count range (e.g. "15-40").

Return ONLY a JSON object. No explanation, no markdown.`;

  try {
    const enriched = await chatJSON<Partial<GPTDiscoveredLead>>({
      user: enrichPrompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    for (const key of missing) {
      const k = key as keyof GPTDiscoveredLead;
      const val = enriched[k];
      if (val && !lead[k]) {
        (lead as unknown as Record<string, unknown>)[k] = val;
      }
    }
  } catch (err) {
    console.warn(`[Lead Scout] Enrichment warning for ${lead.company_name}:`, err);
  }

  return lead;
}

// ─── Normalise GPT lead → internal shape ────────────────────────────────────

function normalise(raw: GPTDiscoveredLead, vertical: Vertical): DiscoveredLead {
  const numLoc = typeof raw.num_locations === "string"
    ? parseInt(raw.num_locations, 10) || 1
    : raw.num_locations || 1;

  return {
    companyName: raw.company_name?.trim() || "Unknown",
    website: raw.website || null,
    vertical,
    locationCount: numLoc,
    locationCitiesStates: raw.location_cities_states || "",
    bookingPlatform: null,
    googleRating: null,
    googleReviewCount: null,
    annualRevenue: raw.annual_revenue || null,
    employeeCount: raw.size || null,
    firstName: raw.first_name || null,
    lastName: raw.last_name || null,
    title: raw.role || null,
    email: raw.business_email || null,
    phone: raw.phone_number || null,
    linkedinCompany: raw.linkedin_company || null,
    linkedinPersonal: raw.linkedin_personal || null,
    painSignals: [],
    research: raw.research || null,
  };
}

// ─── Deduplication (against DB) ─────────────────────────────────────────────

async function getExistingCompanyNames(): Promise<Set<string>> {
  const rows = await db
    .select({ name: leads.companyName })
    .from(leads);
  return new Set(rows.map((r) => r.name.trim().toLowerCase()));
}

function deduplicateLeads(
  discovered: DiscoveredLead[],
  existing: Set<string>,
): { newLeads: DiscoveredLead[]; duplicatesSkipped: number } {
  const newLeads: DiscoveredLead[] = [];
  let duplicatesSkipped = 0;
  const seenThisBatch = new Set<string>();

  for (const lead of discovered) {
    const key = lead.companyName.trim().toLowerCase();
    if (!key || existing.has(key) || seenThisBatch.has(key)) {
      duplicatesSkipped++;
      continue;
    }
    seenThisBatch.add(key);
    newLeads.push(lead);
  }

  return { newLeads, duplicatesSkipped };
}

// ─── Scoring Logic ──────────────────────────────────────────────────────────

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

// ─── Tier Classification ────────────────────────────────────────────────────

export function classifyTier(lead: DiscoveredLead): Tier {
  if (lead.locationCount >= 6) return "tier_2";
  return "tier_1";
}

// ─── DB Insert ──────────────────────────────────────────────────────────────

async function insertLeads(newLeads: DiscoveredLead[]): Promise<number> {
  let inserted = 0;
  for (const lead of newLeads) {
    const { score, breakdown } = scoreLead(lead);
    const tier = classifyTier(lead);

    await db.insert(leads).values({
      companyName: lead.companyName,
      website: lead.website,
      vertical: lead.vertical,
      tier,
      locationCount: lead.locationCount,
      locationCitiesStates: lead.locationCitiesStates,
      bookingPlatform: lead.bookingPlatform,
      googleRating: lead.googleRating,
      googleReviewCount: lead.googleReviewCount,
      annualRevenue: lead.annualRevenue,
      employeeCount: lead.employeeCount,
      score,
      scoreBreakdown: JSON.stringify(breakdown),
      firstName: lead.firstName,
      lastName: lead.lastName,
      title: lead.title,
      email: lead.email,
      phone: lead.phone,
      linkedinCompany: lead.linkedinCompany,
      linkedinPersonal: lead.linkedinPersonal,
      pipelineStage: "cold",
      painSignals: JSON.stringify(lead.painSignals),
      research: lead.research,
      source: "lead_scout",
    });
    inserted++;
  }
  return inserted;
}

// ─── Main Agent Runner ──────────────────────────────────────────────────────

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
    const existingNames = await getExistingCompanyNames();
    let totalDiscovered = 0;
    let totalEnriched = 0;
    let totalDuplicates = 0;
    let totalInserted = 0;

    for (const cat of CATEGORIES) {
      console.log(`[Lead Scout] Discovering ${cat.count} ${cat.label} leads...`);

      // Step 1: GPT Discovery
      let rawLeads: GPTDiscoveredLead[];
      try {
        rawLeads = await gptDiscoverLeads(cat.label, cat.count);
      } catch (err) {
        console.error(`[Lead Scout] Discovery failed for ${cat.label}:`, err);
        rawLeads = [];
      }
      totalDiscovered += rawLeads.length;

      // Step 2: GPT Enrichment (with gentle rate limiting)
      const enriched: GPTDiscoveredLead[] = [];
      for (let i = 0; i < rawLeads.length; i++) {
        console.log(`[Lead Scout] Enriching ${i + 1}/${rawLeads.length}: ${rawLeads[i].company_name}`);
        enriched.push(await gptEnrichLead(rawLeads[i]));
        // 300ms delay between enrichment calls (matches rainey.py's time.sleep(0.3))
        if (i < rawLeads.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      totalEnriched += enriched.length;

      // Step 3: Normalise
      const normalised = enriched.map((raw) => normalise(raw, cat.vertical));

      // Step 4: Deduplicate
      const { newLeads, duplicatesSkipped } = deduplicateLeads(normalised, existingNames);
      totalDuplicates += duplicatesSkipped;

      // Add new names to the set so subsequent categories also dedupe
      for (const lead of newLeads) {
        existingNames.add(lead.companyName.trim().toLowerCase());
      }

      // Step 5: Score & insert
      const inserted = await insertLeads(newLeads);
      totalInserted += inserted;
      console.log(`[Lead Scout] ${cat.label}: ${inserted} new, ${duplicatesSkipped} duplicates skipped`);
    }

    const summary = `Lead Scout completed: ${totalInserted} new leads inserted (${totalDiscovered} discovered, ${totalEnriched} enriched, ${totalDuplicates} duplicates skipped)`;
    console.log(`[Lead Scout] ${summary}`);

    // Update run record
    await db
      .update(agentRuns)
      .set({
        status: "completed",
        completedAt: sql`datetime('now')`,
        itemsProcessed: totalInserted,
        summary,
      })
      .where(eq(agentRuns.id, run.id));

    return {
      success: true,
      leadsDiscovered: totalDiscovered,
      leadsEnriched: totalEnriched,
      duplicatesSkipped: totalDuplicates,
      summary,
    };
  } catch (error) {
    const errMsg = `Lead Scout failed: ${error}`;
    console.error(`[Lead Scout] ${errMsg}`);

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
      summary: errMsg,
    };
  }
}
