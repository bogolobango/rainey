/**
 * Agent 6: Proposal & ROI Generator (Deal Acceleration)
 *
 * Trigger: When prospect moves to "Demo Completed" or on-demand
 * Purpose: Generate custom proposal within 30 minutes of completed demo.
 */

import type { Lead, Proposal } from "@/types";
import { formatCurrency, calculateROI } from "@/lib/utils";
import { generateCallPrep, type CallPrepBriefing } from "./prospect-research";

interface ProposalInput {
  lead: Lead;
  callNotes?: string;
  painPointsMentioned?: string[];
  objectionsRaised?: string[];
  decisionTimeline?: string;
  budgetSignals?: string;
}

interface GeneratedProposal {
  executiveSummary: string;
  currentStateAnalysis: string;
  proposedSolution: string;
  financialModel: string;
  implementationTimeline: string;
  caseStudy: string;
  pricing: string;
  nextSteps: string;
}

// ─── Proposal Generator ──────────────────────────────────────────────────────
export function generateProposal(input: ProposalInput): GeneratedProposal {
  const { lead, callNotes, painPointsMentioned, objectionsRaised, decisionTimeline } = input;
  const roi = calculateROI(lead.locationCount);
  const callPrep = generateCallPrep(lead);
  const fm = callPrep.financialModel;

  // Executive Summary
  const executiveSummary = `${lead.companyName} is losing an estimated ${formatCurrency(fm.estimatedAnnualLostRevenue)} annually from slow inquiry response times across ${lead.locationCount} locations. Etienne Agency's AI-powered booking automation will recover ${formatCurrency(fm.estimatedYear1Recovery)} in Year 1 value through instant 24/7 inquiry handling, while integrating seamlessly with ${lead.bookingPlatform || "your existing booking platform"}. Projected ROI: ${fm.roi}X with a ${fm.paybackDays}-day payback period.`;

  // Current State Analysis
  const painPoints = painPointsMentioned || lead.painSignals || [];
  const currentStateAnalysis = [
    `${lead.companyName} operates ${lead.locationCount} locations${lead.locationCitiesStates ? ` across ${lead.locationCitiesStates}` : ""}.`,
    painPoints.length > 0
      ? `Key challenges identified: ${painPoints.join("; ")}.`
      : "Industry benchmarks suggest 80% of leads are lost when facilities can't respond instantly.",
    `With an estimated ${(lead.locationCount * 500 * 12).toLocaleString()} annual inquiries, even a 5% improvement in response-to-booking conversion represents significant revenue recovery.`,
    callNotes || "",
  ].filter(Boolean).join("\n\n");

  // Proposed Solution
  const proposedSolution = `Etienne Agency deploys an AI-powered intelligence layer that integrates with ${lead.bookingPlatform || "your existing booking platform"} to automate 60%+ of routine customer inquiries — 24/7, across SMS, email, and web chat.

Key capabilities:
• Instant response to all inquiries (< 30 seconds vs. industry avg of 42 hours)
• Smart booking automation that works within your existing system
• After-hours coverage without additional staffing
• No-show prevention through automated reminders and confirmations
• Multilingual support for diverse customer bases
• Real-time analytics and inquiry insights

This is NOT a rip-and-replace solution. We are the intelligence layer on top of your existing infrastructure.`;

  // Financial Model
  const financialModel = `INVESTMENT
Setup & Integration: ${formatCurrency(lead.locationCount <= 5 ? 2000 : 5000)} (one-time)
Monthly Service: ${formatCurrency(roi.monthlyInvestment)}/month (${lead.locationCount} locations × $500/location)
Annual Total: ${formatCurrency(roi.annualInvestment)}

PROJECTED RETURNS (Year 1)
Lost Revenue Recovery: ${formatCurrency(fm.estimatedAnnualLostRevenue)}
Labor Cost Savings (15%): ${formatCurrency(Math.round(fm.estimatedAnnualLostRevenue * 0.15))}
No-Show Prevention: ${formatCurrency(Math.round(lead.locationCount * 8000))}
Upsell/Cross-Sell Revenue: ${formatCurrency(Math.round(lead.locationCount * 5000))}
Total Year 1 Value: ${formatCurrency(fm.estimatedYear1Recovery)}

KEY METRICS
ROI: ${fm.roi}X
Net Return: ${formatCurrency(fm.estimatedYear1Recovery - roi.annualInvestment)}
Payback Period: ${fm.paybackDays} days
Break-Even: ${Math.ceil(roi.monthlyInvestment / 150)} additional bookings/month`;

  // Implementation Timeline
  const implementationTimeline = `Week 1: API integration with ${lead.bookingPlatform || "your booking platform"} & system setup
Week 2: AI prompt engineering & knowledge base configuration specific to ${lead.companyName}
Week 3: Testing & staff training (free pilot at 1 location — zero risk)
Week 4: Go-live monitoring & optimization across all ${lead.locationCount} locations

Total time to full deployment: 4 weeks
Free pilot at 1 location before committing to full rollout`;

  // Case Study
  const caseStudy = callPrep.recommendedCaseStudy;

  // Pricing
  const pricing = `OPTION A: Standard Rollout
Setup & Integration: ${formatCurrency(lead.locationCount <= 5 ? 2000 : 5000)} (one-time)
Monthly Service: ${formatCurrency(roi.monthlyInvestment)}/month
12-Month Commitment: ${formatCurrency(roi.annualInvestment)} total Year 1

OPTION B: Pilot Program
Free 4-week pilot at 1 location
Data-driven decision based on pilot results
Full rollout pricing as above upon success

All pricing includes: 24/7 AI-powered inquiry handling, integration with ${lead.bookingPlatform || "your platform"}, monthly performance reporting, dedicated account management.`;

  // Next Steps
  const nextSteps = decisionTimeline
    ? `Based on our conversation, here are the agreed next steps:\n${decisionTimeline}`
    : `Recommended next steps:
1. Review this proposal with your team (we recommend a ${lead.locationCount <= 5 ? "1-week" : "2-week"} internal review window)
2. Schedule a brief follow-up call to address any questions
3. Select pilot location and begin 4-week free trial
4. Data review after pilot → decision on full rollout

We're available for a follow-up call at your convenience.`;

  return {
    executiveSummary,
    currentStateAnalysis,
    proposedSolution,
    financialModel,
    implementationTimeline,
    caseStudy,
    pricing,
    nextSteps,
  };
}
