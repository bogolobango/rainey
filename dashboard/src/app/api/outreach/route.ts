import { NextRequest, NextResponse } from "next/server";
import { isApolloConfigured, searchSequences, searchOutreachEmails } from "@/lib/integrations/apollo";
import { mapEmailToOutreach } from "@/lib/apollo-mapper";
import { db, getDb } from "@/lib/db";
import { outreachMessages, leads } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET() {
  try {
    // ── Apollo path (live data) ──────────────────────────────────────────
    if (isApolloConfigured()) {
      const sequences = await searchSequences({ activeOnly: true });
      const sequenceIds = sequences.map(s => s.id);

      if (sequenceIds.length === 0) {
        return NextResponse.json({ messages: [], draftCount: 0, approvedCount: 0, sequences: [] });
      }

      const { emails } = await searchOutreachEmails(sequenceIds, { perPage: 50 });

      const messages = emails.map((e, i) => {
        const mapped = mapEmailToOutreach(e, i);
        return {
          id: mapped.id,
          leadId: mapped.leadId,
          channel: mapped.channel,
          templateId: mapped.templateId,
          subject: mapped.subject,
          body: mapped.body,
          personalizationNotes: mapped.personalizationNotes,
          roiCalculation: mapped.roiCalculation,
          status: mapped.status,
          sequenceDay: mapped.sequenceDay,
          scheduledAt: mapped.scheduledAt,
          sentAt: mapped.sentAt,
          createdAt: mapped.createdAt,
          companyName: e.contact?.organization_name ?? e.contact?.name ?? null,
          contactFirst: e.contact?.first_name ?? null,
          contactLast: e.contact?.last_name ?? null,
          score: null,
        };
      });

      return NextResponse.json({
        messages,
        draftCount: 0,
        approvedCount: messages.length,
        sequences: sequences.map(s => ({ id: s.id, name: s.name })),
      });
    }

    // ── SQLite fallback ──────────────────────────────────────────────────
    await getDb();
    const messages = await db
      .select({
        id: outreachMessages.id,
        leadId: outreachMessages.leadId,
        channel: outreachMessages.channel,
        templateId: outreachMessages.templateId,
        subject: outreachMessages.subject,
        body: outreachMessages.body,
        personalizationNotes: outreachMessages.personalizationNotes,
        roiCalculation: outreachMessages.roiCalculation,
        status: outreachMessages.status,
        sequenceDay: outreachMessages.sequenceDay,
        scheduledAt: outreachMessages.scheduledAt,
        sentAt: outreachMessages.sentAt,
        createdAt: outreachMessages.createdAt,
        companyName: leads.companyName,
        contactFirst: leads.firstName,
        contactLast: leads.lastName,
        score: leads.score,
      })
      .from(outreachMessages)
      .leftJoin(leads, eq(outreachMessages.leadId, leads.id))
      .orderBy(desc(outreachMessages.createdAt))
      .limit(50);

    const draftCount = messages.filter(m => m.status === "draft").length;
    const approvedCount = messages.filter(m => m.status === "approved").length;

    return NextResponse.json({ messages, draftCount, approvedCount });
  } catch (error) {
    console.error("Failed to fetch outreach:", error);
    return NextResponse.json({ error: "Failed to fetch outreach" }, { status: 500 });
  }
}

/**
 * PATCH /api/outreach — Approve, reject, or edit outreach messages.
 * Only works with SQLite backend (Apollo messages are read-only).
 */
export async function PATCH(request: NextRequest) {
  try {
    await getDb();
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case "approve": {
        const { messageIds } = body as { messageIds: number[] };
        if (!messageIds?.length) {
          return NextResponse.json({ error: "messageIds required" }, { status: 400 });
        }
        await db.update(outreachMessages)
          .set({ status: "approved" })
          .where(inArray(outreachMessages.id, messageIds));
        return NextResponse.json({ updated: messageIds.length, status: "approved" });
      }

      case "approve_all": {
        const drafts = await db.select({ id: outreachMessages.id })
          .from(outreachMessages)
          .where(eq(outreachMessages.status, "draft"));
        if (drafts.length > 0) {
          await db.update(outreachMessages)
            .set({ status: "approved" })
            .where(eq(outreachMessages.status, "draft"));
        }
        return NextResponse.json({ updated: drafts.length, status: "approved" });
      }

      case "reject": {
        const { messageIds } = body as { messageIds: number[] };
        if (!messageIds?.length) {
          return NextResponse.json({ error: "messageIds required" }, { status: 400 });
        }
        for (const id of messageIds) {
          await db.delete(outreachMessages).where(eq(outreachMessages.id, id));
        }
        return NextResponse.json({ deleted: messageIds.length });
      }

      case "edit": {
        const { messageId, subject, body: newBody } = body as {
          messageId: number; subject?: string; body?: string;
        };
        if (!messageId) {
          return NextResponse.json({ error: "messageId required" }, { status: 400 });
        }
        const updates: Record<string, unknown> = {};
        if (subject !== undefined) updates.subject = subject;
        if (newBody !== undefined) updates.body = newBody;

        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        await db.update(outreachMessages)
          .set(updates)
          .where(eq(outreachMessages.id, messageId));

        return NextResponse.json({ updated: 1, messageId });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use approve, approve_all, reject, or edit.` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Failed to update outreach:", error);
    return NextResponse.json({ error: "Failed to update outreach" }, { status: 500 });
  }
}
