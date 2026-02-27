import { db } from "@/lib/db";
import { leads, pipelineEvents, outreachMessages, followUpSequences } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Signature Verification ──────────────────────────────────────────────────

/**
 * Verify HMAC-SHA256 webhook signature.
 * Each provider sends a signature header; we validate against
 * the corresponding WEBHOOK_SECRET_* env var.
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

// ─── Lead Lookup ─────────────────────────────────────────────────────────────

/** Find a lead by email address (case-insensitive). */
export async function findLeadByEmail(email: string) {
  const results = await db
    .select()
    .from(leads)
    .where(eq(leads.email, email.toLowerCase()))
    .limit(1);
  return results[0] ?? null;
}

/** Find a lead by ID. */
export async function findLeadById(leadId: number) {
  const results = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return results[0] ?? null;
}

// ─── Pipeline Advancement ────────────────────────────────────────────────────

export interface AdvanceResult {
  leadId: number;
  fromStage: string;
  toStage: string;
  eventId: number;
}

/**
 * Move a lead to a new pipeline stage and record the event.
 * Returns null if the lead is already at or past the target stage.
 */
export async function advancePipeline(
  leadId: number,
  toStage: string,
  trigger: string,
  notes?: string,
): Promise<AdvanceResult | null> {
  const current = await db
    .select({ stage: leads.pipelineStage })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (current.length === 0) return null;

  const fromStage = current[0].stage;

  // Don't regress — only advance forward
  const STAGE_ORDER = [
    "cold", "contacted", "responded", "discovery_booked",
    "demo_completed", "proposal_sent", "negotiating",
    "closed_won", "closed_lost",
  ];
  const fromIdx = STAGE_ORDER.indexOf(fromStage);
  const toIdx = STAGE_ORDER.indexOf(toStage);
  if (toIdx >= 0 && fromIdx >= 0 && fromIdx >= toIdx) return null;

  await db
    .update(leads)
    .set({ pipelineStage: toStage, updatedAt: sql`datetime('now')` })
    .where(eq(leads.id, leadId));

  const [event] = await db.insert(pipelineEvents).values({
    leadId,
    fromStage,
    toStage,
    trigger,
    notes: notes ?? null,
  }).returning();

  return { leadId, fromStage, toStage, eventId: event.id };
}

// ─── Outreach Message Updates ────────────────────────────────────────────────

/** Find the most recent outreach message sent to a lead on a given channel. */
export async function findLatestOutreachMessage(leadId: number, channel?: string) {
  const conditions = [eq(outreachMessages.leadId, leadId)];
  if (channel) conditions.push(eq(outreachMessages.channel, channel));

  const results = await db
    .select()
    .from(outreachMessages)
    .where(and(...conditions))
    .orderBy(desc(outreachMessages.createdAt))
    .limit(1);

  return results[0] ?? null;
}

/** Mark an outreach message with engagement timestamps. */
export async function updateMessageEngagement(
  messageId: number,
  fields: {
    status?: string;
    sentAt?: string;
    openedAt?: string;
    clickedAt?: string;
    repliedAt?: string;
  },
) {
  await db
    .update(outreachMessages)
    .set(fields)
    .where(eq(outreachMessages.id, messageId));
}

// ─── Follow-Up Sequence Control ──────────────────────────────────────────────

/** Pause follow-up sequences for a lead (e.g. after a reply or booked call). */
export async function pauseFollowUpSequences(leadId: number, _reason: string) {
  await db
    .update(followUpSequences)
    .set({
      status: "paused",
      updatedAt: sql`datetime('now')`,
    })
    .where(
      and(
        eq(followUpSequences.leadId, leadId),
        eq(followUpSequences.status, "active"),
      ),
    );
}

/** Exit (complete) follow-up sequences for a lead. */
export async function exitFollowUpSequences(leadId: number) {
  await db
    .update(followUpSequences)
    .set({
      status: "exited",
      updatedAt: sql`datetime('now')`,
    })
    .where(
      and(
        eq(followUpSequences.leadId, leadId),
        eq(followUpSequences.status, "active"),
      ),
    );
}
