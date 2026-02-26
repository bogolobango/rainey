/**
 * Agent 5: Follow-Up Sequencing (Multi-Touch Automation)
 *
 * Trigger: After initial outreach sent + daily check at 10:00 AM ET
 * Purpose: Manage persistent, value-adding follow-up sequences.
 *
 * Sequence:
 *   Day 0:  Initial outreach (email + LinkedIn)
 *   Day 3:  Follow-up #1 — Value add (Template D)
 *   Day 7:  Follow-up #2 — Case study drop (Template E)
 *   Day 14: Follow-up #3 — Breakup email (Template F)
 *   Day 21: Channel switch
 *   Day 30: Final touch — Industry report offer
 */

import type { Lead, Channel } from "@/types";
import { generateMessage, type TemplateId } from "./outreach-composer";

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
  { day: 7, templateId: "E", channel: "email", description: "Follow-up #2 — Case study" },
  { day: 14, templateId: "F", channel: "email", description: "Follow-up #3 — Breakup" },
  { day: 21, templateId: "B", channel: "linkedin", description: "Channel switch — LinkedIn InMail" },
  { day: 30, templateId: "F", channel: "email", description: "Final touch — Report offer" },
];

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

export function handleSignal(signal: SignalType): SignalAction {
  switch (signal) {
    case "email_opened":
      return {
        signal,
        action: "Accelerate next touch by 1 day, increase urgency",
        accelerateDays: -1,
      };
    case "link_clicked":
      return {
        signal,
        action: "Generate warm follow-up referencing clicked content, queue within 1 hour",
        accelerateDays: -3, // Move next touch to ~now
      };
    case "reply_received":
      return {
        signal,
        action: "Exit sequence immediately, flag for Jim, generate suggested response",
        exitSequence: true,
      };
    case "linkedin_accepted":
      return {
        signal,
        action: "Generate LinkedIn message follow-up within 24 hours, different from email content",
        accelerateDays: 0,
      };
    case "ooo_detected":
      return {
        signal,
        action: "Pause sequence, reschedule based on return date",
      };
    case "bounce_detected":
      return {
        signal,
        action: "Find alternate email via Apollo, restart sequence with new address",
      };
  }
}

// ─── Sequence Manager ────────────────────────────────────────────────────────
export function getNextTouchpoint(
  currentDay: number,
  _channelsUsed: Channel[] // reserved for future channel rotation logic
): TouchPoint | null {
  // Find the next touchpoint after the current day
  const upcoming = SEQUENCE_TOUCHPOINTS.filter(tp => tp.day > currentDay);
  if (upcoming.length === 0) return null;
  return upcoming[0];
}

export function generateFollowUpMessage(
  lead: Lead,
  touchpoint: TouchPoint
): {
  subject: string | null;
  body: string;
  channel: Channel;
  templateId: TemplateId;
  sequenceDay: number;
} {
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
  activeSequences: Array<{ lead: Lead; currentDay: number; channelsUsed: Channel[] }>
): Array<{
  leadId: number;
  company: string;
  subject: string | null;
  body: string;
  channel: Channel;
  templateId: TemplateId;
  sequenceDay: number;
}> {
  const queue: Array<{
    leadId: number;
    company: string;
    subject: string | null;
    body: string;
    channel: Channel;
    templateId: TemplateId;
    sequenceDay: number;
  }> = [];

  for (const seq of activeSequences) {
    const nextTp = getNextTouchpoint(seq.currentDay, seq.channelsUsed);
    if (!nextTp) continue;

    // Check if today is the scheduled day
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
