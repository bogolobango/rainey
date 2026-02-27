import { NextResponse } from "next/server";
import {
  isApolloConfigured,
  searchSequences,
  getSequence,
  getAllSequenceContacts,
  searchOutreachEmails,
} from "@/lib/integrations/apollo";

/**
 * GET /api/apollo/sequences — Live Apollo sequence data.
 *
 * Returns the two active sequences with contacts, email stats,
 * step details, and notes.
 */
export async function GET() {
  if (!isApolloConfigured()) {
    return NextResponse.json(
      { error: "APOLLO_API_KEY not configured. Set it in your environment variables." },
      { status: 503 },
    );
  }

  try {
    // 1. Discover active sequences
    const sequences = await searchSequences({ activeOnly: true });

    if (sequences.length === 0) {
      return NextResponse.json({ sequences: [], message: "No active sequences found in Apollo." });
    }

    // 2. For each sequence, fetch details (steps), contacts, and emails
    const enriched = await Promise.all(
      sequences.map(async (seq) => {
        const [details, emailResult] = await Promise.all([
          getSequence(seq.id),
          searchOutreachEmails([seq.id], { perPage: 100 }),
        ]);

        // Get contacts for this specific sequence
        const contacts = await getAllSequenceContacts([seq.id]);

        // Build per-contact status summary
        const contactSummaries = contacts.map((c) => {
          const seqStatus = (c.contact_campaign_statuses ?? [])
            .find(s => s.emailer_campaign_id === seq.id);

          return {
            id: c.id,
            name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
            email: c.email,
            title: c.title,
            company: c.organization_name ?? c.account?.name ?? "",
            linkedinUrl: c.linkedin_url,
            status: seqStatus?.status ?? "unknown",
            addedAt: seqStatus?.added_at ?? c.created_at,
            finishedAt: seqStatus?.finished_at ?? null,
            labels: c.label_names ?? [],
          };
        });

        // Build step summaries from sequence details
        const steps = (details?.emailer_steps ?? []).map((step) => ({
          id: step.id,
          position: step.position,
          type: step.type,
          waitDays: step.wait_time,
          note: step.note ?? null,
          subject: step.subject_template ?? null,
          body: step.body_template ?? null,
        }));

        return {
          id: seq.id,
          name: seq.name,
          active: seq.active,
          numSteps: seq.num_steps,
          createdAt: seq.created_at,
          // Aggregate stats
          stats: {
            totalContacts: seq.unique_scheduled,
            delivered: seq.unique_delivered,
            opened: seq.unique_opened,
            replied: seq.unique_replied,
            bounced: seq.unique_bounced,
            demoed: seq.unique_demoed,
            openRate: seq.open_rate,
            clickRate: seq.click_rate,
            replyRate: seq.reply_rate,
            bounceRate: seq.bounce_rate,
            demoRate: seq.demo_rate,
          },
          steps,
          contacts: contactSummaries,
          recentEmails: emailResult.emails.slice(0, 20).map((e) => ({
            id: e.id,
            contactId: e.contact_id,
            contactName: e.contact ? `${e.contact.first_name ?? ""} ${e.contact.last_name ?? ""}`.trim() : null,
            company: e.contact?.organization_name ?? null,
            subject: e.subject,
            status: e.status,
            sentAt: e.sent_at,
            openedAt: e.opened_at,
            clickedAt: e.clicked_at,
            repliedAt: e.replied_at,
            bouncedAt: e.bounced_at,
          })),
          totalEmails: emailResult.totalEntries,
        };
      }),
    );

    return NextResponse.json({ sequences: enriched });
  } catch (error) {
    console.error("Failed to fetch Apollo sequences:", error);
    return NextResponse.json({ error: "Failed to fetch Apollo sequences" }, { status: 500 });
  }
}
