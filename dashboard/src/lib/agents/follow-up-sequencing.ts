/**
 * Agent 5: Follow-Up Sequencing (Multi-Touch Automation)
 *
 * Trigger: After initial outreach sent + daily check at 10:00 AM ET
 * Purpose: Manage persistent, value-adding follow-up sequences with
 *          channel mixing (email → LinkedIn → phone → email).
 *
 * Sequence (30-day, 8 touches, 3 channels):
 *   Day 0:  Email (Template A/C) + LinkedIn connect (Template B)
 *   Day 3:  Email follow-up (Template D — value add)
 *   Day 5:  Phone call script (warm intro)
 *   Day 7:  Email (Template E — case study)
 *   Day 14: Email (Template F — breakup)
 *   Day 21: LinkedIn InMail (Template B variant)
 *   Day 30: Final email — report offer (Template F variant)
 */

import type { Lead, Channel } from "@/types";
import { generateMessage, type TemplateId } from "./outreach-composer";
import { formatCurrency, calculateROI } from "@/lib/utils";

// ─── Sequence Definition ─────────────────────────────────────────────────────

export interface TouchPoint {
  day: number;
  templateId: TemplateId;
  channel: Channel;
  description: string;
}

export const SEQUENCE_TOUCHPOINTS: TouchPoint[] = [
  { day: 0, templateId: "A", channel: "email", description: "Initial cold email" },
  { day: 0, templateId: "B", channel: "linkedin", description: "LinkedIn connection request" },
  { day: 3, templateId: "D", channel: "email", description: "Follow-up #1 — Value add" },
  { day: 5, templateId: "A", channel: "phone", description: "Warm call — reference email sent" },
  { day: 7, templateId: "E", channel: "email", description: "Follow-up #2 — Case study" },
  { day: 14, templateId: "F", channel: "email", description: "Follow-up #3 — Breakup" },
  { day: 21, templateId: "B", channel: "linkedin", description: "Channel switch — LinkedIn InMail" },
  { day: 30, templateId: "F", channel: "email", description: "Final touch — Report offer" },
];

// ─── Phone Script Generator ─────────────────────────────────────────────────

export function generatePhoneScript(lead: Lead): {
  subject: string | null;
  body: string;
  channel: Channel;
  templateId: TemplateId;
  personalizationNotes: string;
  roiCalculation: string;
} {
  const roi = calculateROI(lead.locationCount);
  const lostRevPerLoc: Record<string, number> = {
    indoor_sports: 56000, med_spa: 72000, dental: 48000, youth_sports: 40000,
  };
  const annualLost = lead.locationCount * (lostRevPerLoc[lead.vertical] || 50000);
  const verticalLabel = lead.vertical === "indoor_sports" ? "sports facilities"
    : lead.vertical === "med_spa" ? "med spas"
    : lead.vertical === "dental" ? "dental practices" : "sports academies";

  const script = `PHONE SCRIPT — ${lead.companyName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPENER:
"Hi ${lead.firstName}, this is Jim from Etienne Agency. I sent you an email earlier this week about automating inquiry handling for ${lead.companyName}'s ${lead.locationCount} locations — did you get a chance to see it?"

IF YES → PIVOT:
"Great. The core idea: industry data shows ${verticalLabel} like yours lose roughly ${formatCurrency(annualLost)} a year from slow response times. We plug an AI layer into your existing ${lead.bookingPlatform || "booking system"} — no rip-and-replace — and automate 60% of routine inquiries 24/7."

IF NO → QUICK PITCH:
"No worries — short version: we help multi-location ${verticalLabel} recapture leads lost from slow response times. For your ${lead.locationCount} locations, that's likely ${formatCurrency(annualLost)}/year in lost revenue."

TRANSITION TO MEETING:
"I'd love to show you what this looks like for ${lead.companyName} specifically — would you have 15 minutes this week or next for a quick demo?"

OBJECTION HANDLES:
• "We have a system" → "We don't replace it — we make it smarter. Plugs in via API."
• "Not interested" → "Totally understand. Can I send you our industry report on response time impact? No strings."
• "Send me info" → "Absolutely. I'll send a one-pager with ROI numbers for your ${lead.locationCount} locations. Best email?"

KEY STATS:
• ${formatCurrency(annualLost)}/yr estimated lost revenue
• ${roi.roi}X projected ROI
• Arena Sports (5 locations): 10X ROI Year 1
• 80% of inquiries lost without instant response`;

  return {
    subject: `Call Script: ${lead.companyName}`,
    body: script,
    channel: "phone",
    templateId: "A",
    personalizationNotes: `Phone script — ${lead.locationCount} locations, warm call after email`,
    roiCalculation: `${lead.locationCount} locations × $500/mo = ${formatCurrency(roi.monthlyInvestment)}/mo → ${roi.roi}X ROI`,
  };
}

// ─── Signal-Based Adaptations ────────────────────────────────────────────────

export type SignalType =
  | "email_opened"
  | "link_clicked"
  | "reply_received"
  | "linkedin_accepted"
  | "ooo_detected"
  | "bounce_detected";

interface SignalAction {
  signal: SignalType;
  action: string;
  accelerateDays?: number;
  pauseUntil?: string;
  exitSequence?: boolean;
}

export function handleSignal(signal: SignalType, _context?: { returnDate?: string }): SignalAction {
  switch (signal) {
    case "email_opened":
      return { signal, action: "Accelerate next touch by 1 day, consider phone call", accelerateDays: -1 };
    case "link_clicked":
      return { signal, action: "Hot lead — warm follow-up + phone script within 1 hour", accelerateDays: -3 };
    case "reply_received":
      return { signal, action: "Exit sequence, flag for Jim, generate suggested response", exitSequence: true };
    case "linkedin_accepted":
      return { signal, action: "Generate LinkedIn follow-up message within 24 hours", accelerateDays: 0 };
    case "ooo_detected":
      return { signal, action: "Pause sequence, reschedule on return date", pauseUntil: _context?.returnDate };
    case "bounce_detected":
      return { signal, action: "Find alternate email via Apollo, restart sequence" };
  }
}

// ─── Sequence Manager ────────────────────────────────────────────────────────

export function getNextTouchpoint(
  currentDay: number,
  channelsUsed: Channel[],
): TouchPoint | null {
  const upcoming = SEQUENCE_TOUCHPOINTS.filter((tp) => tp.day > currentDay);
  if (upcoming.length === 0) return null;

  // If email used 3+ times in a row, prefer a different channel next
  const recentEmailCount = channelsUsed.slice(-3).filter((c) => c === "email").length;
  if (recentEmailCount >= 3) {
    const nonEmail = upcoming.find((tp) => tp.channel !== "email");
    if (nonEmail) return nonEmail;
  }

  return upcoming[0];
}

export function generateFollowUpMessage(
  lead: Lead,
  touchpoint: TouchPoint,
): {
  subject: string | null;
  body: string;
  channel: Channel;
  templateId: TemplateId;
  sequenceDay: number;
  personalizationNotes?: string;
  roiCalculation?: string;
} {
  if (touchpoint.channel === "phone") {
    const script = generatePhoneScript(lead);
    return {
      subject: script.subject,
      body: script.body,
      channel: "phone",
      templateId: script.templateId,
      sequenceDay: touchpoint.day,
      personalizationNotes: script.personalizationNotes,
      roiCalculation: script.roiCalculation,
    };
  }

  const msg = generateMessage(lead, touchpoint.templateId);
  return {
    subject: msg.subject,
    body: msg.body,
    channel: touchpoint.channel,
    templateId: touchpoint.templateId,
    sequenceDay: touchpoint.day,
  };
}

// ─── Daily Follow-Up Queue Builder ───────────────────────────────────────────

export function buildDailyFollowUpQueue(
  activeSequences: Array<{ lead: Lead; currentDay: number; channelsUsed: Channel[] }>,
): Array<{
  leadId: number;
  company: string;
  subject: string | null;
  body: string;
  channel: Channel;
  templateId: TemplateId;
  sequenceDay: number;
  personalizationNotes?: string;
  roiCalculation?: string;
}> {
  const queue: Array<{
    leadId: number;
    company: string;
    subject: string | null;
    body: string;
    channel: Channel;
    templateId: TemplateId;
    sequenceDay: number;
    personalizationNotes?: string;
    roiCalculation?: string;
  }> = [];

  for (const seq of activeSequences) {
    const nextTp = getNextTouchpoint(seq.currentDay, seq.channelsUsed);
    if (!nextTp) continue;

    if (nextTp.day <= seq.currentDay + 1) {
      const msg = generateFollowUpMessage(seq.lead, nextTp);
      queue.push({
        leadId: seq.lead.id,
        company: seq.lead.companyName,
        ...msg,
      });
    }
  }

  return queue;
}
