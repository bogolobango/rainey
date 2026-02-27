import { NextResponse } from "next/server";
import { isApolloConfigured, searchSequences, getAllSequenceContacts } from "@/lib/integrations/apollo";
import { db, getDb } from "@/lib/db";
import { followUpSequences, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // ── Apollo path ──────────────────────────────────────────────────────
    if (isApolloConfigured()) {
      const apolloSequences = await searchSequences({ activeOnly: true });
      const sequenceIds = apolloSequences.map(s => s.id);
      const contacts = sequenceIds.length > 0
        ? await getAllSequenceContacts(sequenceIds)
        : [];

      // Each contact enrolled in a sequence is a follow-up
      const sequences = contacts.map((contact, i) => {
        const seqStatuses = contact.contact_campaign_statuses ?? [];
        const activeStatus = seqStatuses.find(s => s.status === "active");
        const seqInfo = activeStatus
          ? apolloSequences.find(s => s.id === activeStatus.emailer_campaign_id)
          : apolloSequences[0];

        return {
          id: i + 1,
          leadId: i + 1,
          currentDay: 0,
          status: activeStatus?.status ?? "active",
          nextTouchAt: null,
          channelHistory: JSON.stringify(["email"]),
          pausedUntil: null,
          createdAt: activeStatus?.added_at ?? contact.created_at,
          updatedAt: contact.updated_at,
          companyName: contact.organization_name ?? contact.account?.name ?? null,
          contactFirst: contact.first_name ?? null,
          contactLast: contact.last_name ?? null,
          // Extra Apollo fields
          sequenceName: seqInfo?.name ?? null,
          sequenceId: seqInfo?.id ?? null,
        };
      });

      return NextResponse.json({ sequences });
    }

    // ── SQLite fallback ──────────────────────────────────────────────────
    await getDb();
    const sequences = await db
      .select({
        id: followUpSequences.id,
        leadId: followUpSequences.leadId,
        currentDay: followUpSequences.currentDay,
        status: followUpSequences.status,
        nextTouchAt: followUpSequences.nextTouchAt,
        channelHistory: followUpSequences.channelHistory,
        pausedUntil: followUpSequences.pausedUntil,
        createdAt: followUpSequences.createdAt,
        updatedAt: followUpSequences.updatedAt,
        companyName: leads.companyName,
        contactFirst: leads.firstName,
        contactLast: leads.lastName,
      })
      .from(followUpSequences)
      .leftJoin(leads, eq(followUpSequences.leadId, leads.id))
      .orderBy(desc(followUpSequences.updatedAt))
      .limit(50);

    return NextResponse.json({ sequences });
  } catch (error) {
    console.error("Failed to fetch follow-ups:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}
