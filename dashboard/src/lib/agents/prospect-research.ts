/**
 * Agent 4: Prospect Deep Research (Call Preparation)
 *
 * Trigger: When prospect moves to "Discovery Booked" or on-demand
 * Purpose: Generate comprehensive call prep briefing.
 */

import type { Lead } from "@/types";
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

  return questions;
}

// ─── Objection Handlers ──────────────────────────────────────────────────────
function buildObjectionHandles(lead: Lead): Record<string, string> {
  const fm = buildFinancialModel(lead);

  const handles: Record<string, string> = {
    "We already have a booking system": `We don't replace ${lead.bookingPlatform || "your booking system"} — we make it intelligent. We plug in via API and automate the inquiry-to-booking flow.`,
    "We're too small / not ready": "Arena Sports started with 5 locations and saw 10X ROI in Year 1. We scale with you.",
    "How do I know it works?": "We offer a free pilot at one location. Zero risk, data-driven decision after 4 weeks.",
    "It's too expensive": `At ${formatCurrency(fm.monthlyFee)}/month for your ${lead.locationCount} locations, you need to recover only ${Math.ceil(fm.monthlyFee / 150)} bookings per month to break even. Your estimated lost revenue is ${formatCurrency(fm.estimatedAnnualLostRevenue)}/year.`,
  };

  return handles;
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
    competitiveIntel: `Current stack: ${lead.bookingPlatform || "Unknown"}. As of 2026, no evidence of AI-powered customer service automation among facility competitors — first-mover advantage window open.`,
  };
}
