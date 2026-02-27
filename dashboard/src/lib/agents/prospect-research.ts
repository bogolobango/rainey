/**
 * Agent 4: Prospect Deep Research (Call Preparation + Pre-Outreach)
 *
 * Trigger: When prospect moves to "Discovery Booked" or on-demand
 * Purpose: Generate comprehensive call prep briefings + pre-outreach
 *          research briefs at lead creation time.
 *
 * Upgrades:
 *  - Pre-outreach research brief (generated at lead creation, not just discovery_booked)
 *  - Enriched competitive intel per vertical
 *  - Technology stack detection from booking platform data
 *  - Decision-maker background analysis
 */

import type { Lead, Vertical } from "@/types";
import { formatCurrency, calculateROI } from "@/lib/utils";

export interface CallPrepBriefing {
  companySnapshot: {
    locations: number;
    platform: string;
    googleRating: number | null;
    googleReviewCount: number | null;
    estimatedAnnualRevenue: string;
    estimatedAnnualInquiries: number;
  };
  painSignals: string[];
  financialModel: {
    estimatedAnnualLostRevenue: number;
    estimatedYear1Recovery: number;
    investment: number;
    roi: number;
    paybackDays: number;
    monthlyFee: number;
  };
  killerQuestions: string[];
  objectionHandles: Record<string, string>;
  recommendedCaseStudy: string;
  competitiveIntel: string;
}

// ─── Pre-Outreach Research Brief ────────────────────────────────────────────

export interface PreOutreachBrief {
  companySize: string;
  techStack: string;
  reputationSummary: string;
  painHypotheses: string[];
  personalizationHooks: string[];
  recommendedTemplate: "A" | "C";
  outreachAngle: string;
}

/**
 * Generate a quick research brief at lead creation time.
 * This gives the Outreach Composer better personalization data
 * before drafting the first email.
 */
export function generatePreOutreachBrief(lead: Lead): PreOutreachBrief {
  // Determine company size bucket
  const size = lead.locationCount >= 20 ? "Enterprise (20+ locations)"
    : lead.locationCount >= 10 ? "Mid-market (10-19 locations)"
    : lead.locationCount >= 5 ? "Growth stage (5-9 locations)"
    : "Small (2-4 locations)";

  // Tech stack inference from booking platform
  const platformIntel = inferTechStack(lead.bookingPlatform);

  // Reputation analysis from Google reviews
  const reputation = analyzeReputation(lead);

  // Pain hypotheses based on all available signals
  const painHypotheses = generatePainHypotheses(lead);

  // Personalization hooks for outreach
  const hooks = generatePersonalizationHooks(lead);

  // Recommended template and angle
  const template = (lead.vertical === "indoor_sports" || lead.vertical === "youth_sports") ? "A" as const : "C" as const;
  const angle = determineOutreachAngle(lead, painHypotheses);

  return {
    companySize: size,
    techStack: platformIntel,
    reputationSummary: reputation,
    painHypotheses,
    personalizationHooks: hooks,
    recommendedTemplate: template,
    outreachAngle: angle,
  };
}

function inferTechStack(platform: string | null): string {
  if (!platform) return "Unknown — likely manual or generic CRM";

  const platformMap: Record<string, string> = {
    "Mindbody": "Mindbody (scheduling + POS) — API integration available, common in wellness/fitness",
    "Zenoti": "Zenoti (enterprise wellness) — API available, indicates sophisticated operations",
    "Vagaro": "Vagaro (salon/spa) — limited API, may need webhook approach",
    "Dentrix": "Dentrix (dental PMS) — Henry Schein ecosystem, HL7 integration possible",
    "Open Dental": "Open Dental (dental PMS) — open source, flexible API integration",
    "EZFacility": "EZFacility (sports facility mgmt) — API available for booking automation",
    "Dash Platform": "Dash Platform (sports) — modern API, smooth integration path",
    "Upper Hand": "Upper Hand (sports) — newer platform, solid API documentation",
    "Club Automation": "Club Automation (Daxko) — enterprise grade, requires Daxko partnership",
    "Jonas Club": "Jonas Club — enterprise club management, custom integration required",
  };

  for (const [key, intel] of Object.entries(platformMap)) {
    if (platform.toLowerCase().includes(key.toLowerCase())) {
      return intel;
    }
  }

  return `${platform} — custom integration assessment needed`;
}

function analyzeReputation(lead: Lead): string {
  const rating = lead.googleRating;
  const reviews = lead.googleReviewCount;

  if (!rating || !reviews) return "No Google presence detected — may indicate new or offline-focused business";

  const parts: string[] = [];

  if (rating >= 4.5 && reviews > 500) {
    parts.push(`Strong reputation (${rating}★, ${reviews.toLocaleString()} reviews) — high volume, high satisfaction`);
    parts.push("Likely generating strong inbound demand → pain is in CAPTURING not generating leads");
  } else if (rating >= 4.0) {
    parts.push(`Good reputation (${rating}★, ${reviews.toLocaleString()} reviews)`);
    if (reviews > 200) {
      parts.push("Moderate-high volume — automation ROI is strong at this scale");
    }
  } else if (rating < 3.5) {
    parts.push(`Below average rating (${rating}★) — potential service quality issues`);
    parts.push("May be harder to close; focus pitch on EFFICIENCY not growth");
  } else {
    parts.push(`Average reputation (${rating}★, ${reviews.toLocaleString()} reviews)`);
  }

  return parts.join(". ");
}

function generatePainHypotheses(lead: Lead): string[] {
  const hypotheses: string[] = [];

  // From explicit pain signals
  if (lead.painSignals?.length > 0) {
    for (const signal of lead.painSignals.slice(0, 3)) {
      hypotheses.push(`Confirmed: ${signal}`);
    }
  }

  // Inferred from location count
  if (lead.locationCount >= 10) {
    hypotheses.push("High location count → likely struggling with consistent service quality across sites");
    hypotheses.push("Staffing coordination across 10+ locations is expensive → automation ROI multiplied");
  } else if (lead.locationCount >= 5) {
    hypotheses.push("Growth-stage operations → likely outgrowing manual processes");
  }

  // Inferred from vertical
  const verticalPains: Record<Vertical, string[]> = {
    indoor_sports: [
      "Peak-hour inquiry overflow (evenings/weekends) when staff is managing facility",
      "Seasonal demand spikes (fall leagues, summer camps) overwhelm front desk",
    ],
    med_spa: [
      "After-hours inquiry loss — patients research procedures at night",
      "High-value procedure inquiries ($500-$5K) lost to competitors who respond faster",
    ],
    dental: [
      "Emergency appointment requests outside office hours go unanswered",
      "New patient inquiry response time directly impacts chair fill rate",
    ],
    youth_sports: [
      "Parent inquiries peak during registration periods — overwhelming seasonal demand",
      "Multi-child/multi-program enrollment complexity frustrates parents",
    ],
  };

  if (verticalPains[lead.vertical]) {
    for (const pain of verticalPains[lead.vertical]) {
      hypotheses.push(`Inferred: ${pain}`);
    }
  }

  return hypotheses;
}

function generatePersonalizationHooks(lead: Lead): string[] {
  const hooks: string[] = [];

  if (lead.locationCitiesStates) {
    const cities = lead.locationCitiesStates.split(",").map(c => c.trim());
    if (cities.length >= 3) {
      hooks.push(`Multi-market presence (${cities.slice(0, 3).join(", ")}) — emphasize consistency across locations`);
    }
  }

  if (lead.googleReviewCount && lead.googleReviewCount > 1000) {
    hooks.push(`${lead.googleReviewCount.toLocaleString()} Google reviews — "Your reputation drives serious volume, but volume without instant response means lost revenue"`);
  }

  if (lead.bookingPlatform) {
    hooks.push(`Already on ${lead.bookingPlatform} — "We don't replace it, we make it smarter" angle`);
  }

  if (lead.painSignals?.[0]) {
    hooks.push(`Lead with pain signal: "${lead.painSignals[0]}" — shows we did our homework`);
  }

  if (lead.title) {
    const title = lead.title.toLowerCase();
    if (title.includes("owner") || title.includes("founder") || title.includes("ceo")) {
      hooks.push("Decision maker is owner/founder — speak to ROI + time savings, not feature list");
    } else if (title.includes("director") || title.includes("vp") || title.includes("manager")) {
      hooks.push("Operational leader — emphasize staff efficiency + metrics they can report upward");
    }
  }

  return hooks;
}

function determineOutreachAngle(lead: Lead, painHypotheses: string[]): string {
  // If we have confirmed pain signals, lead with them
  const confirmedPains = painHypotheses.filter(p => p.startsWith("Confirmed:"));
  if (confirmedPains.length > 0) {
    return `Pain-led: Reference "${confirmedPains[0].replace("Confirmed: ", "")}" — shows research depth`;
  }

  // High location count → lead with scale
  if (lead.locationCount >= 10) {
    return `Scale-led: "Managing inquiries across ${lead.locationCount} locations without proportionally scaling headcount"`;
  }

  // Strong Google presence → lead with volume
  if (lead.googleReviewCount && lead.googleReviewCount > 500) {
    return `Volume-led: "Your ${lead.googleReviewCount.toLocaleString()} reviews signal high demand — are you capturing it all?"`;
  }

  // Default → lead with industry stat
  return `Stat-led: "80% of inquiries lost without instant response — for ${lead.locationCount} locations, that's ${formatCurrency(estimateLostRevenueHelper(lead))}/year"`;
}

function estimateLostRevenueHelper(lead: Lead): number {
  const perLoc: Record<string, number> = {
    indoor_sports: 56000, med_spa: 72000, dental: 48000, youth_sports: 40000,
  };
  return lead.locationCount * (perLoc[lead.vertical] || 50000);
}

// ─── Competitive Intelligence ───────────────────────────────────────────────

export interface CompetitiveIntelReport {
  currentStack: string;
  competitorAutomation: string;
  marketWindow: string;
  differentiators: string[];
  risks: string[];
}

export function generateCompetitiveIntel(lead: Lead): CompetitiveIntelReport {
  const verticalCompetitors: Record<Vertical, { automation: string; window: string }> = {
    indoor_sports: {
      automation: "Low AI adoption — most competitors still rely on front desk staff + voicemail. A few using basic chatbots (Intercom/Drift) but no true booking automation.",
      window: "12-18 month first-mover window before category awareness hits mainstream",
    },
    med_spa: {
      automation: "Moderate — some competitors using PatientPop or Weave for basic follow-ups. No AI-powered full-funnel automation in market yet.",
      window: "6-12 month window — med spa tech adoption is accelerating",
    },
    dental: {
      automation: "Growing — Weave, Birdeye, and RevenueWell offer basic automated reminders. Full AI inquiry handling is still rare.",
      window: "6-12 month window — dental SaaS market is active but fragmented",
    },
    youth_sports: {
      automation: "Very low — most rely on manual processes, Facebook groups, and email lists. Almost zero AI adoption.",
      window: "18-24 month first-mover window — market is tech-underserved",
    },
  };

  const intel = verticalCompetitors[lead.vertical] || verticalCompetitors.indoor_sports;

  return {
    currentStack: lead.bookingPlatform
      ? `${lead.bookingPlatform} (scheduling) — no evidence of AI inquiry automation`
      : "Unknown scheduling system — likely manual or basic CRM",
    competitorAutomation: intel.automation,
    marketWindow: intel.window,
    differentiators: [
      "Full-funnel AI (inquiry → qualification → booking) vs. point solutions",
      "Multi-channel (SMS, email, web chat, phone) vs. single-channel bots",
      "Plugs into existing stack via API — no rip-and-replace",
      "Vertical-specific training data — not generic AI",
      "24/7 instant response vs. business-hours-only solutions",
    ],
    risks: [
      lead.locationCount <= 3 ? "Small footprint may limit ROI perception — emphasize per-location economics" : "",
      lead.bookingPlatform?.toLowerCase().includes("custom") ? "Custom platform may increase integration complexity — set expectations" : "",
      (lead.googleRating ?? 5) < 3.5 ? "Low rating may indicate service issues — automation won't fix root cause" : "",
    ].filter(Boolean),
  };
}

// ─── Financial Model Builder ─────────────────────────────────────────────────
function buildFinancialModel(lead: Lead): CallPrepBriefing["financialModel"] {
  const lostRevenuePerLocation: Record<string, number> = {
    indoor_sports: 56000,
    med_spa: 72000,
    dental: 48000,
    youth_sports: 40000,
  };

  const annualLost = lead.locationCount * (lostRevenuePerLocation[lead.vertical] || 50000);
  const roi = calculateROI(lead.locationCount);

  return {
    estimatedAnnualLostRevenue: annualLost,
    estimatedYear1Recovery: Math.round(annualLost * 2.35), // Include labor savings + upsell
    investment: roi.annualInvestment,
    roi: roi.roi,
    paybackDays: roi.paybackDays,
    monthlyFee: roi.monthlyInvestment,
  };
}

// ─── Question Generator ──────────────────────────────────────────────────────
function generateKillerQuestions(lead: Lead): string[] {
  const questions: string[] = [];

  if (lead.painSignals?.length > 0) {
    questions.push(
      `"I noticed ${lead.painSignals[0].toLowerCase()} — how is your team currently handling that across ${lead.locationCount} locations?"`
    );
  }

  if (lead.bookingPlatform) {
    questions.push(
      `"Your ${lead.bookingPlatform} handles scheduling well — but what happens to the 40% of inquiries that come in after your staff goes home?"`
    );
  }

  questions.push(
    `"With ${lead.locationCount} locations, how are you currently scaling your inquiry handling without proportionally scaling headcount?"`
  );

  if (lead.googleReviewCount && lead.googleReviewCount > 1000) {
    questions.push(
      `"With ${lead.googleReviewCount.toLocaleString()} Google reviews, you clearly have high volume — what percentage of inquiries do you estimate go unanswered?"`
    );
  }

  // Decision-maker role-specific questions
  if (lead.title) {
    const title = lead.title.toLowerCase();
    if (title.includes("owner") || title.includes("ceo") || title.includes("founder")) {
      questions.push(
        `"As the ${lead.title}, what's your biggest bottleneck to growing from ${lead.locationCount} to ${lead.locationCount + 5} locations — is it demand or operational capacity?"`
      );
    } else if (title.includes("director") || title.includes("vp")) {
      questions.push(
        `"What metrics does your team track on inquiry response time? And where's the biggest gap between your target and reality?"`
      );
    }
  }

  // Revenue-specific question
  questions.push(
    `"If I could show you exactly how much revenue ${lead.companyName} is losing from slow response times — with real numbers — would that be valuable enough for 15 minutes of your time?"`
  );

  return questions;
}

// ─── Objection Handlers ──────────────────────────────────────────────────────
function buildObjectionHandles(lead: Lead): Record<string, string> {
  const fm = buildFinancialModel(lead);

  return {
    "We already have a booking system": `We don't replace ${lead.bookingPlatform || "your booking system"} — we make it intelligent. We plug in via API and automate the inquiry-to-booking flow. Think of us as the AI brain that sits on top of ${lead.bookingPlatform || "your current stack"}.`,
    "We're too small / not ready": "Arena Sports started with 5 locations and saw 10X ROI in Year 1. The economics actually work BETTER at your size because you're not yet paying for a large customer service team.",
    "How do I know it works?": "We offer a free pilot at one location. Zero risk, data-driven decision after 4 weeks. You'll see exactly how many inquiries we captured that would have been lost.",
    "It's too expensive": `At ${formatCurrency(fm.monthlyFee)}/month for your ${lead.locationCount} locations, you need to recover only ${Math.ceil(fm.monthlyFee / 150)} bookings per month to break even. Your estimated lost revenue is ${formatCurrency(fm.estimatedAnnualLostRevenue)}/year — that's ${formatCurrency(Math.round(fm.estimatedAnnualLostRevenue / 12))}/month walking out the door.`,
    "We need to think about it": "Absolutely — what specifically do you want to think through? I ask because the facilities that see the fastest ROI are the ones that move during their high-demand period. When's your next peak season?",
    "Can you send me some info?": "Of course. I'll send a one-pager with your specific ROI numbers for ${lead.locationCount} locations, plus the Arena Sports case study. But honestly, a 15-minute call will tell you more than any document — can we get that on the calendar while I send it over?",
  };
}

// ─── Main Generator ──────────────────────────────────────────────────────────
export function generateCallPrep(lead: Lead): CallPrepBriefing {
  const fm = buildFinancialModel(lead);
  const inquiryEstimate = lead.locationCount * 500 * 12; // ~500 inquiries/location/month

  return {
    companySnapshot: {
      locations: lead.locationCount,
      platform: lead.bookingPlatform || "Unknown",
      googleRating: lead.googleRating,
      googleReviewCount: lead.googleReviewCount,
      estimatedAnnualRevenue: lead.annualRevenue || "Unknown",
      estimatedAnnualInquiries: inquiryEstimate,
    },
    painSignals: lead.painSignals || [],
    financialModel: fm,
    killerQuestions: generateKillerQuestions(lead),
    objectionHandles: buildObjectionHandles(lead),
    recommendedCaseStudy:
      lead.vertical === "indoor_sports"
        ? "Arena Sports (Seattle, 5 locations): 60% automation rate, 15% labor cost reduction, 10X ROI in Year 1"
        : "Industry benchmark: 80% of leads lost without instant response; 78% buy from first responder; 42-hour avg response time in service businesses",
    competitiveIntel: generateCompetitiveIntel(lead).competitorAutomation,
  };
}
