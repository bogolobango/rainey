/**
 * Agent 2: Outreach Composer (Message Generation)
 *
 * Trigger: Daily at 7:00 AM ET + on-demand
 * Purpose: Generate 20 personalized, ready-to-send outreach messages daily.
 *
 * Templates: A (Tier 1 Sports), B (LinkedIn), C (Med Spa/Dental),
 *            D (Day 3 Follow-Up), E (Day 7 Case Study), F (Day 14 Breakup)
 */

import type { Lead, Channel, Vertical, Tier } from "@/types";
import { formatCurrency, calculateROI } from "@/lib/utils";

// ─── Template IDs ────────────────────────────────────────────────────────────
export type TemplateId = "A" | "B" | "C" | "D" | "E" | "F";

interface GeneratedMessage {
  subject: string | null;
  body: string;
  channel: Channel;
  templateId: TemplateId;
  personalizationNotes: string;
  roiCalculation: string;
}

// ─── Template Selection Logic ────────────────────────────────────────────────
export function selectTemplate(lead: Lead, sequenceDay: number): { templateId: TemplateId; channel: Channel } {
  // Follow-up templates based on sequence day
  if (sequenceDay === 3) return { templateId: "D", channel: "email" };
  if (sequenceDay === 7) return { templateId: "E", channel: "email" };
  if (sequenceDay >= 14) return { templateId: "F", channel: "email" };

  // Initial outreach — select based on vertical and channel
  if (lead.vertical === "indoor_sports" || lead.vertical === "youth_sports") {
    return { templateId: "A", channel: "email" };
  }
  return { templateId: "C", channel: "email" };
}

// ─── ROI Calculation String ──────────────────────────────────────────────────
function buildROILine(locations: number): string {
  const roi = calculateROI(locations);
  return `${locations} locations × $500/mo = ${formatCurrency(roi.monthlyInvestment)}/mo investment → estimated ${roi.roi}X ROI`;
}

// ─── Lost Revenue Estimation ─────────────────────────────────────────────────
function estimateLostRevenue(locations: number, vertical: Vertical): number {
  const perLocationLoss: Record<Vertical, number> = {
    indoor_sports: 56000,  // ~$56K/location/year
    med_spa: 72000,        // ~$72K/location/year (higher ticket)
    dental: 48000,         // ~$48K/location/year
    youth_sports: 40000,   // ~$40K/location/year
  };
  return locations * (perLocationLoss[vertical] || 50000);
}

// ─── Template Generators ─────────────────────────────────────────────────────

function generateTemplateA(lead: Lead): GeneratedMessage {
  const lostRevenue = estimateLostRevenue(lead.locationCount, lead.vertical);
  const painOpener = lead.painSignals?.[0]
    ? `I noticed ${lead.painSignals[0].toLowerCase()} — `
    : "";

  return {
    subject: `How ${lead.companyName} can capture the 80% of leads you're currently losing`,
    body: `Hi ${lead.firstName},

${painOpener}I work with multi-location indoor sports facilities to solve a problem that's costing the industry millions: slow inquiry response times.

Industry data shows that 80% of inquiries are lost when facilities can't respond instantly—especially after hours or during peak times when staff are overwhelmed. For a ${lead.locationCount}-location operation like ${lead.companyName}, that's likely costing you ${formatCurrency(lostRevenue)} in annual lost revenue.

We've built an AI-powered system that integrates with your existing booking platform${lead.bookingPlatform ? ` (${lead.bookingPlatform})` : ""} and automates 60% of routine inquiries—instantly, 24/7, across SMS, email, and web chat.

Our most recent comparable client (Arena Sports, Seattle, 5 locations) achieved a 10X ROI in their first year.

Would you be open to a 15-minute call next week to see if this could work for ${lead.companyName}?`,
    channel: "email",
    templateId: "A",
    personalizationNotes: `${lead.locationCount} locations, ${lead.bookingPlatform || "unknown"} platform, ${lead.painSignals?.length || 0} pain signals detected`,
    roiCalculation: buildROILine(lead.locationCount),
  };
}

function generateTemplateB(lead: Lead): GeneratedMessage {
  const verticalLabel = lead.vertical === "indoor_sports" ? "indoor sports facilities"
    : lead.vertical === "med_spa" ? "med spas"
    : lead.vertical === "dental" ? "dental practices"
    : "sports facilities";
  const region = lead.locationCitiesStates?.split(",")[0]?.trim() || "the NYC metro area";

  return {
    subject: null,
    body: `Hi ${lead.firstName}, I've been researching multi-location ${verticalLabel} in ${region}, and ${lead.companyName}'s approach really stood out. I work with facilities like yours to automate inquiry handling and recapture lost revenue from slow response times. Would be great to connect.`,
    channel: "linkedin",
    templateId: "B",
    personalizationNotes: `LinkedIn connection request — ${lead.locationCount} locations in ${region}`,
    roiCalculation: buildROILine(lead.locationCount),
  };
}

function generateTemplateC(lead: Lead): GeneratedMessage {
  const monthlyLost = Math.round(estimateLostRevenue(lead.locationCount, lead.vertical) / 12);
  const procedureRange = lead.vertical === "med_spa" ? "$500–$5,000" : "$200–$2,000";
  const procedureType = lead.vertical === "med_spa" ? "procedures" : "appointments";

  return {
    subject: `The ${formatCurrency(monthlyLost)} your ${lead.companyName} locations lose every month from missed calls`,
    body: `Hi ${lead.firstName},

Individual ${procedureType} at practices like yours cost ${procedureRange}. When a potential patient calls and nobody picks up — or they have to wait 24+ hours for a callback — that revenue walks to a competitor.

For a ${lead.locationCount}-location operation, we estimate that's ${formatCurrency(monthlyLost)} in monthly lost revenue from response delays alone.

We've built an AI system that answers every inquiry instantly — 24/7, across phone, text, email, and web chat — and books directly into your existing scheduling system. No rip-and-replace. Plugs right in.

Similar practices see a 10X ROI within 90 days.

Worth a 15-minute call to see if the numbers work for ${lead.companyName}?`,
    channel: "email",
    templateId: "C",
    personalizationNotes: `Med spa/dental template — ${lead.locationCount} locations, est. ${formatCurrency(monthlyLost)}/mo lost`,
    roiCalculation: buildROILine(lead.locationCount),
  };
}

function generateTemplateD(lead: Lead): GeneratedMessage {
  return {
    subject: `Re: How ${lead.companyName} can capture lost leads`,
    body: `Hi ${lead.firstName},

Quick follow-up — the core question: Is ${lead.companyName} currently losing revenue because you can't respond to inquiries instantly, 24/7?

If the answer is yes (or even "maybe"), it's worth a 15-minute conversation. Our system has delivered a 10X ROI for similar operations.

Happy to send over a one-pager or jump on a quick call — whatever works best.`,
    channel: "email",
    templateId: "D",
    personalizationNotes: "Day 3 follow-up — value-add approach",
    roiCalculation: buildROILine(lead.locationCount),
  };
}

function generateTemplateE(lead: Lead): GeneratedMessage {
  return {
    subject: `How Arena Sports recovered $500K+ in Year 1`,
    body: `Hi ${lead.firstName},

I know you're busy, so I'll lead with results: Arena Sports (5 locations, Seattle) implemented our AI booking automation and saw:
• 60% of routine inquiries automated
• 15% reduction in labor costs
• 10X ROI in Year 1

Their situation was similar to ${lead.companyName}'s — multi-location, high inquiry volume, manual booking processes.

I put together a quick breakdown of what this could look like for your ${lead.locationCount} locations. Want me to send it over?`,
    channel: "email",
    templateId: "E",
    personalizationNotes: "Day 7 follow-up — Arena Sports case study drop",
    roiCalculation: buildROILine(lead.locationCount),
  };
}

function generateTemplateF(lead: Lead): GeneratedMessage {
  const annualLost = estimateLostRevenue(lead.locationCount, lead.vertical);

  return {
    subject: `Closing the loop on ${lead.companyName}`,
    body: `Hi ${lead.firstName},

I've reached out a couple of times about helping ${lead.companyName} automate inquiry handling and recover lost revenue. I understand the timing might not be right.

I'll leave you with this: facilities like yours are losing an estimated ${formatCurrency(annualLost)} annually from slow response times. When you're ready to explore automation, our door is open.

In the meantime, I'm happy to send over our industry report on the cost of slow lead response — no strings attached. Just reply "send it."`,
    channel: "email",
    templateId: "F",
    personalizationNotes: "Day 14 breakup email — soft close with value offer",
    roiCalculation: buildROILine(lead.locationCount),
  };
}

// ─── Main Generator ──────────────────────────────────────────────────────────
export function generateMessage(lead: Lead, templateId: TemplateId): GeneratedMessage {
  switch (templateId) {
    case "A": return generateTemplateA(lead);
    case "B": return generateTemplateB(lead);
    case "C": return generateTemplateC(lead);
    case "D": return generateTemplateD(lead);
    case "E": return generateTemplateE(lead);
    case "F": return generateTemplateF(lead);
    default: return generateTemplateA(lead);
  }
}

// ─── Batch Generator ─────────────────────────────────────────────────────────
export function generateOutreachBatch(leads: Lead[]): {
  messages: (GeneratedMessage & { leadId: number })[];
  summary: string;
} {
  const messages: (GeneratedMessage & { leadId: number })[] = [];

  for (const lead of leads) {
    // Generate email
    const { templateId, channel } = selectTemplate(lead, 0);
    const emailMsg = generateMessage(lead, templateId);
    messages.push({ ...emailMsg, leadId: lead.id });

    // Also generate LinkedIn connection request
    const linkedinMsg = generateMessage(lead, "B");
    messages.push({ ...linkedinMsg, leadId: lead.id });
  }

  return {
    messages,
    summary: `Generated ${messages.length} messages for ${leads.length} leads (${messages.filter(m => m.channel === "email").length} emails, ${messages.filter(m => m.channel === "linkedin").length} LinkedIn)`,
  };
}
