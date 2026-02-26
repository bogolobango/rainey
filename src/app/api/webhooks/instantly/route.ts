import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  verifyHmacSignature,
  findLeadByEmail,
  findLeadById,
  advancePipeline,
  findLatestOutreachMessage,
  updateMessageEngagement,
  pauseFollowUpSequences,
} from "@/lib/webhooks/utils";
import { handleSignalTrigger } from "@/lib/agents/orchestrator";

/**
 * POST /api/webhooks/instantly
 *
 * Receives engagement callbacks from Instantly.ai cold email platform.
 *
 * Expected payload (Instantly webhook format):
 * {
 *   "event_type": "email_sent" | "email_opened" | "email_clicked" | "email_replied" | "email_bounced",
 *   "timestamp": "2026-02-26T14:30:00Z",
 *   "email": "lance@brooklynboulders.com",
 *   "lead_id": "instantly-lead-uuid",
 *   "campaign_id": "campaign-uuid",
 *   "campaign_name": "NYC Sports Facilities - Feb 2026",
 *   "subject": "Reducing missed bookings at Brooklyn Boulders",
 *   "metadata": {
 *     "rainey_lead_id": 1        // Our internal lead ID, set when sending
 *   }
 * }
 *
 * Security: HMAC-SHA256 signature in X-Instantly-Signature header,
 * validated against WEBHOOK_SECRET_INSTANTLY env var.
 */

type InstantlyEvent = "email_sent" | "email_opened" | "email_clicked" | "email_replied" | "email_bounced";

interface InstantlyPayload {
  event_type: InstantlyEvent;
  timestamp: string;
  email: string;
  lead_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  subject?: string;
  metadata?: {
    rainey_lead_id?: number;
  };
}

export async function POST(request: NextRequest) {
  await getDb();
  const rawBody = await request.text();

  // ── Signature verification ──
  const secret = process.env.WEBHOOK_SECRET_INSTANTLY;
  if (secret) {
    const signature = request.headers.get("x-instantly-signature") ?? "";
    if (!verifyHmacSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: InstantlyPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, timestamp, email } = payload;

  if (!event_type || !email) {
    return NextResponse.json({ error: "Missing event_type or email" }, { status: 400 });
  }

  // ── Resolve lead — try metadata ID first, then email lookup ──
  let lead = payload.metadata?.rainey_lead_id
    ? await findLeadById(payload.metadata.rainey_lead_id)
    : null;

  if (!lead) {
    lead = await findLeadByEmail(email);
  }

  if (!lead) {
    console.log(`[webhook:instantly] Event ${event_type} for unknown email: ${email}`);
    return NextResponse.json({ status: "ignored", reason: "unknown_lead" });
  }

  const now = timestamp ?? new Date().toISOString();
  const message = await findLatestOutreachMessage(lead.id, "email");
  let pipelineAdvanced = false;
  let sequencesPaused = false;

  // ── Handle each event type ──
  switch (event_type) {
    case "email_sent": {
      if (message) {
        await updateMessageEngagement(message.id, { status: "sent", sentAt: now });
      }
      // Advance cold → contacted
      const result = await advancePipeline(
        lead.id,
        "contacted",
        "instantly_sent",
        `Email sent via Instantly: ${payload.subject ?? "(no subject)"}`,
      );
      pipelineAdvanced = !!result;
      break;
    }

    case "email_opened": {
      if (message) {
        await updateMessageEngagement(message.id, { status: "opened", openedAt: now });
      }
      // Trigger orchestrator — tracks open count, accelerates if 3+
      await handleSignalTrigger({ type: "email_opened", leadId: lead.id, openCount: 1 }).catch(console.error);
      break;
    }

    case "email_clicked": {
      if (message) {
        await updateMessageEngagement(message.id, { status: "clicked", clickedAt: now });
      }
      // Trigger orchestrator — generates warm follow-up, accelerates sequence, notifies Jim
      await handleSignalTrigger({
        type: "link_clicked",
        leadId: lead.id,
        url: payload.subject ?? "email link",
      }).catch(console.error);
      break;
    }

    case "email_replied": {
      if (message) {
        await updateMessageEngagement(message.id, { status: "replied", repliedAt: now });
      }
      const result = await advancePipeline(
        lead.id,
        "responded",
        "instantly_reply",
        `Reply detected via Instantly campaign "${payload.campaign_name ?? "unknown"}"`,
      );
      pipelineAdvanced = !!result;
      await pauseFollowUpSequences(lead.id, "instantly_reply");
      sequencesPaused = true;
      // Trigger orchestrator — exits sequences, notifies Jim for immediate response
      await handleSignalTrigger({ type: "prospect_replied", leadId: lead.id }).catch(console.error);
      break;
    }

    case "email_bounced": {
      if (message) {
        await updateMessageEngagement(message.id, { status: "bounced" });
      }
      // Pause sequence — bad email, needs review
      await pauseFollowUpSequences(lead.id, "email_bounced");
      sequencesPaused = true;
      // Trigger orchestrator — attempts Apollo email recovery, restarts sequence
      await handleSignalTrigger({ type: "email_bounced", leadId: lead.id }).catch(console.error);
      break;
    }

    default:
      console.log(`[webhook:instantly] Unknown event type: ${event_type}`);
      return NextResponse.json({ status: "ignored", reason: "unknown_event" });
  }

  console.log(
    `[webhook:instantly] ${event_type} for ${email} (lead #${lead.id} ${lead.companyName})`,
  );

  return NextResponse.json({
    status: "processed",
    event: event_type,
    leadId: lead.id,
    company: lead.companyName,
    messageUpdated: !!message,
    pipelineAdvanced,
    sequencesPaused,
  });
}
