import { NextRequest, NextResponse } from "next/server";
import { db, getDb } from "@/lib/db";
import { callPreps, pipelineEvents } from "@/lib/db/schema";
import {
  verifyHmacSignature,
  findLeadByEmail,
  findLeadById,
  advancePipeline,
  exitFollowUpSequences,
} from "@/lib/webhooks/utils";

/**
 * POST /api/webhooks/calendar
 *
 * Receives calendar event notifications — supports both:
 *   1. Calendly webhooks (invitee.created / invitee.canceled)
 *   2. Google Calendar push notifications (forwarded via proxy)
 *
 * Expected payload:
 * {
 *   "provider": "calendly" | "google",
 *   "event": "booking_created" | "booking_canceled",
 *   "inviteeEmail": "lance@brooklynboulders.com",
 *   "inviteeName": "Lance Pinn",
 *   "eventName": "Rainey Discovery Call",
 *   "scheduledAt": "2026-03-02T14:00:00Z",
 *   "duration": 30,
 *   "meetingUrl": "https://meet.google.com/abc-xyz",
 *   "metadata": {
 *     "rainey_lead_id": 1
 *   }
 * }
 *
 * Security: HMAC-SHA256 signature in X-Webhook-Signature header,
 * validated against WEBHOOK_SECRET_CALENDAR env var.
 */

interface CalendarPayload {
  provider: "calendly" | "google";
  event: "booking_created" | "booking_canceled";
  inviteeEmail: string;
  inviteeName?: string;
  eventName?: string;
  scheduledAt: string;
  duration?: number;
  meetingUrl?: string;
  metadata?: {
    rainey_lead_id?: number;
  };
}

export async function POST(request: NextRequest) {
  await getDb();
  const rawBody = await request.text();

  // ── Signature verification ──
  const secret = process.env.WEBHOOK_SECRET_CALENDAR;
  if (secret) {
    const signature = request.headers.get("x-webhook-signature")
      ?? request.headers.get("x-calendly-webhook-signature")
      ?? "";
    if (!verifyHmacSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: CalendarPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event: eventType, inviteeEmail, scheduledAt } = payload;

  if (!eventType || !inviteeEmail || !scheduledAt) {
    return NextResponse.json(
      { error: "Missing event, inviteeEmail, or scheduledAt" },
      { status: 400 },
    );
  }

  // ── Resolve lead ──
  let lead = payload.metadata?.rainey_lead_id
    ? await findLeadById(payload.metadata.rainey_lead_id)
    : null;

  if (!lead) {
    lead = await findLeadByEmail(inviteeEmail);
  }

  if (!lead) {
    console.log(`[webhook:calendar] ${eventType} for unknown email: ${inviteeEmail}`);
    return NextResponse.json({ status: "ignored", reason: "unknown_lead" });
  }

  // ── Handle booking created ──
  if (eventType === "booking_created") {
    const dateLabel = new Date(scheduledAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Advance pipeline to discovery_booked
    const advancement = await advancePipeline(
      lead.id,
      "discovery_booked",
      "calendar_event",
      `Discovery call booked: ${dateLabel}${payload.meetingUrl ? ` — ${payload.meetingUrl}` : ""}`,
    );

    // Exit active follow-up sequences — prospect is engaged
    await exitFollowUpSequences(lead.id);

    // Scaffold a call prep doc for the Prospect Research agent to fill
    await db.insert(callPreps).values({
      leadId: lead.id,
      callDate: scheduledAt,
      companySnapshot: "",
      painSignals: "[]",
      financialModel: "{}",
      killerQuestions: "[]",
      objectionHandles: "{}",
      recommendedCaseStudy: "",
      competitiveIntel: "",
    });

    console.log(
      `[webhook:calendar] Discovery call booked for ${lead.companyName} (lead #${lead.id}) at ${dateLabel}` +
      (advancement ? ` — advanced to ${advancement.toStage}` : " — stage unchanged"),
    );

    return NextResponse.json({
      status: "processed",
      event: "booking_created",
      leadId: lead.id,
      company: lead.companyName,
      pipelineAdvanced: !!advancement,
      callPrepCreated: true,
      sequencesExited: true,
    });
  }

  // ── Handle booking canceled ──
  if (eventType === "booking_canceled") {
    // Don't regress the pipeline stage — just log it
    // The rep can manually decide what to do
    await db.insert(pipelineEvents).values({
      leadId: lead.id,
      fromStage: lead.pipelineStage,
      toStage: lead.pipelineStage, // same stage — no advancement
      trigger: "calendar_canceled",
      notes: `Discovery call canceled by ${payload.inviteeName ?? inviteeEmail}`,
    });

    console.log(
      `[webhook:calendar] Booking canceled for ${lead.companyName} (lead #${lead.id})`,
    );

    return NextResponse.json({
      status: "processed",
      event: "booking_canceled",
      leadId: lead.id,
      company: lead.companyName,
      note: "Cancellation logged. Pipeline stage unchanged — manual review recommended.",
    });
  }

  return NextResponse.json({ status: "ignored", reason: "unknown_event" });
}
