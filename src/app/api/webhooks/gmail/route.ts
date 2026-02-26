import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  verifyHmacSignature,
  findLeadByEmail,
  advancePipeline,
  findLatestOutreachMessage,
  updateMessageEngagement,
  pauseFollowUpSequences,
} from "@/lib/webhooks/utils";

/**
 * POST /api/webhooks/gmail
 *
 * Receives Gmail reply notifications (via Google Apps Script, Zapier,
 * or a Gmail push subscription forwarded through a proxy).
 *
 * Expected payload:
 * {
 *   "event": "reply_received",
 *   "from": "lance@brooklynboulders.com",
 *   "to": "alex@rainey.ai",
 *   "subject": "Re: Reducing missed bookings at Brooklyn Boulders",
 *   "snippet": "Hi Alex, this sounds interesting…",
 *   "messageId": "<gmail-message-id>",
 *   "threadId": "<gmail-thread-id>",
 *   "receivedAt": "2026-02-26T14:30:00Z"
 * }
 *
 * Security: HMAC-SHA256 signature in X-Webhook-Signature header,
 * validated against WEBHOOK_SECRET_GMAIL env var.
 */
export async function POST(request: NextRequest) {
  await getDb();
  const rawBody = await request.text();

  // ── Signature verification ──
  const secret = process.env.WEBHOOK_SECRET_GMAIL;
  if (secret) {
    const signature = request.headers.get("x-webhook-signature") ?? "";
    if (!verifyHmacSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: {
    event: string;
    from: string;
    to?: string;
    subject?: string;
    snippet?: string;
    messageId?: string;
    threadId?: string;
    receivedAt?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.from) {
    return NextResponse.json({ error: "Missing 'from' field" }, { status: 400 });
  }

  // ── Find the lead by sender email ──
  const senderEmail = payload.from.replace(/<|>/g, "").trim().toLowerCase();
  const lead = await findLeadByEmail(senderEmail);

  if (!lead) {
    // Not a known lead — log and acknowledge so the sender doesn't retry
    console.log(`[webhook:gmail] Reply from unknown address: ${senderEmail}`);
    return NextResponse.json({ status: "ignored", reason: "unknown_sender" });
  }

  const now = payload.receivedAt ?? new Date().toISOString();

  // ── Update outreach message ──
  const message = await findLatestOutreachMessage(lead.id, "email");
  if (message) {
    await updateMessageEngagement(message.id, {
      status: "replied",
      repliedAt: now,
    });
  }

  // ── Advance pipeline to "responded" ──
  const advancement = await advancePipeline(
    lead.id,
    "responded",
    "email_reply",
    `Gmail reply: ${payload.subject ?? "(no subject)"} — "${(payload.snippet ?? "").slice(0, 120)}"`,
  );

  // ── Pause follow-up sequences ──
  await pauseFollowUpSequences(lead.id, "email_reply");

  console.log(
    `[webhook:gmail] Processed reply from ${senderEmail} (lead #${lead.id} ${lead.companyName})` +
    (advancement ? ` — advanced to ${advancement.toStage}` : " — stage unchanged"),
  );

  return NextResponse.json({
    status: "processed",
    leadId: lead.id,
    company: lead.companyName,
    messageUpdated: !!message,
    pipelineAdvanced: !!advancement,
    sequencesPaused: true,
  });
}
