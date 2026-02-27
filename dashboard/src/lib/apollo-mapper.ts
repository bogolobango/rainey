/**
 * Apollo → Dashboard Data Mapper
 *
 * Converts raw Apollo API responses into the shapes expected by
 * existing dashboard components (same contracts as the SQLite routes).
 */

import type { Lead, OutreachMessage, PipelineStage } from "@/types";
import type { ApolloRawContact, ApolloRawEmail, ApolloSequence } from "@/lib/integrations/apollo";

// ─── Contact → Lead ────────────────────────────────────────────────────────

/**
 * Map Apollo contact sequence status to our pipeline stages.
 *
 * Apollo contact_campaign_statuses[].status values:
 *   active, paused, finished, bounced, not_sent
 *
 * We combine this with email engagement (opened, clicked, replied)
 * to infer a more granular pipeline stage.
 */
function inferPipelineStage(contact: ApolloRawContact): PipelineStage {
  const statuses = contact.contact_campaign_statuses ?? [];
  const hasActive = statuses.some(s => s.status === "active");
  const hasFinished = statuses.some(s => s.status === "finished");
  const hasBounced = statuses.some(s => s.status === "bounced");

  // Check label_names for manual stage signals
  const labels = (contact.label_names ?? []).map(l => l.toLowerCase());
  if (labels.includes("closed_won") || labels.includes("closed won")) return "closed_won";
  if (labels.includes("closed_lost") || labels.includes("closed lost")) return "closed_lost";
  if (labels.includes("negotiating")) return "negotiating";
  if (labels.includes("proposal_sent") || labels.includes("proposal sent")) return "proposal_sent";
  if (labels.includes("demo_completed") || labels.includes("demo completed")) return "demo_completed";
  if (labels.includes("discovery_booked") || labels.includes("discovery booked") || labels.includes("interested")) return "discovery_booked";
  if (labels.includes("responded") || labels.includes("replied")) return "responded";

  // Infer from sequence status
  if (hasBounced) return "cold";
  if (hasFinished) return "contacted"; // finished sequence without explicit reply
  if (hasActive) return "contacted";

  return "cold";
}

export function mapContactToLead(contact: ApolloRawContact, index: number): Lead {
  const phone = contact.sanitized_phone
    ?? contact.phone_numbers?.[0]?.sanitized_number
    ?? null;

  return {
    id: index + 1, // synthetic numeric ID
    companyName: contact.account?.name ?? contact.organization_name ?? "Unknown",
    website: contact.account?.website_url ?? null,
    vertical: "indoor_sports", // Apollo doesn't map to our verticals; default
    tier: "tier_1",
    locationCount: 1,
    locationCitiesStates: null,
    bookingPlatform: null,
    googleRating: null,
    googleReviewCount: null,
    annualRevenue: null,
    employeeCount: null,
    score: 0, // no score from Apollo
    scoreBreakdown: null,
    firstName: contact.first_name || null,
    lastName: contact.last_name || null,
    title: contact.title || null,
    email: contact.email || null,
    phone,
    linkedinCompany: contact.account?.linkedin_url ?? null,
    linkedinPersonal: contact.linkedin_url ?? null,
    pipelineStage: inferPipelineStage(contact),
    painSignals: [],
    research: null,
    source: "apollo",
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
  };
}

// ─── Email → OutreachMessage ───────────────────────────────────────────────

export function mapEmailToOutreach(email: ApolloRawEmail, index: number): OutreachMessage {
  let status: OutreachMessage["status"] = "sent";
  if (email.replied_at) status = "replied";
  else if (email.clicked_at) status = "clicked";
  else if (email.opened_at) status = "opened";
  else if (email.bounced_at) status = "bounced";
  else if (email.sent_at) status = "delivered";

  return {
    id: index + 1,
    leadId: 0, // linked by contact_id in Apollo, not a numeric FK
    channel: "email",
    templateId: email.emailer_step_id || null,
    subject: email.subject || null,
    body: email.body_text || email.body_html || "",
    personalizationNotes: null,
    roiCalculation: null,
    status,
    sequenceDay: 0,
    scheduledAt: null,
    sentAt: email.sent_at || null,
    openedAt: email.opened_at || null,
    clickedAt: email.clicked_at || null,
    repliedAt: email.replied_at || null,
    createdAt: email.created_at,
    // Attach contact info for the outreach UI
    lead: email.contact
      ? mapContactToLead(email.contact, 0)
      : undefined,
  };
}

// ─── Sequences → Follow-Up Sequences ──────────────────────────────────────

export interface MappedSequence {
  id: number;
  apolloId: string;
  name: string;
  active: boolean;
  numSteps: number;
  totalContacts: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  demoRate: number;
}

export function mapSequence(seq: ApolloSequence, index: number): MappedSequence {
  return {
    id: index + 1,
    apolloId: seq.id,
    name: seq.name,
    active: seq.active,
    numSteps: seq.num_steps,
    totalContacts: seq.unique_scheduled,
    delivered: seq.unique_delivered,
    opened: seq.unique_opened,
    replied: seq.unique_replied,
    bounced: seq.unique_bounced,
    openRate: seq.open_rate,
    clickRate: seq.click_rate,
    replyRate: seq.reply_rate,
    demoRate: seq.demo_rate,
  };
}

// ─── Pipeline Stage Aggregation ────────────────────────────────────────────

export function aggregatePipelineStages(
  contacts: ApolloRawContact[],
): Record<PipelineStage, number> {
  const counts: Record<PipelineStage, number> = {
    cold: 0,
    contacted: 0,
    responded: 0,
    discovery_booked: 0,
    demo_completed: 0,
    proposal_sent: 0,
    negotiating: 0,
    closed_won: 0,
    closed_lost: 0,
  };

  for (const contact of contacts) {
    const stage = inferPipelineStage(contact);
    counts[stage]++;
  }

  return counts;
}

// ─── Stats Aggregation ─────────────────────────────────────────────────────

export interface ApolloStats {
  totalLeads: number;
  newLeadsToday: number;
  activeProspects: number;
  messagesQueuedToday: number;
  messagesSentToday: number;
  responsesToday: number;
  discoveryCallsThisWeek: number;
  proposalsSentThisWeek: number;
  pipelineByStage: Record<PipelineStage, number>;
  responseRate: number;
  avgLeadScore: number;
  staleProspects: number;
}

export function computeStatsFromApollo(
  contacts: ApolloRawContact[],
  sequences: ApolloSequence[],
  emails: ApolloRawEmail[],
): ApolloStats {
  const today = new Date().toISOString().split("T")[0];
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();

  const pipelineByStage = aggregatePipelineStages(contacts);
  const activeStages: PipelineStage[] = [
    "contacted", "responded", "discovery_booked",
    "demo_completed", "proposal_sent", "negotiating",
  ];
  const activeProspects = activeStages.reduce((sum, s) => sum + pipelineByStage[s], 0);

  // Email stats
  const sentToday = emails.filter(
    e => e.sent_at && e.sent_at.startsWith(today),
  ).length;
  const repliedToday = emails.filter(
    e => e.replied_at && e.replied_at.startsWith(today),
  ).length;

  // New contacts today
  const newToday = contacts.filter(
    c => c.created_at && c.created_at.startsWith(today),
  ).length;

  // Aggregate sequence stats
  const totalDelivered = sequences.reduce((s, seq) => s + seq.unique_delivered, 0);
  const totalReplied = sequences.reduce((s, seq) => s + seq.unique_replied, 0);
  const responseRate = totalDelivered > 0
    ? Math.round((totalReplied / totalDelivered) * 1000) / 10
    : 0;

  // Stale prospects: updated > 5 days ago, not in terminal stages
  const staleProspects = contacts.filter(c => {
    const stage = inferPipelineStage(c);
    if (stage === "cold" || stage === "closed_won" || stage === "closed_lost") return false;
    return c.updated_at < fiveDaysAgo;
  }).length;

  return {
    totalLeads: contacts.length,
    newLeadsToday: newToday,
    activeProspects,
    messagesQueuedToday: 0, // Apollo doesn't expose "queued" emails
    messagesSentToday: sentToday,
    responsesToday: repliedToday,
    discoveryCallsThisWeek: pipelineByStage.discovery_booked,
    proposalsSentThisWeek: pipelineByStage.proposal_sent,
    pipelineByStage,
    responseRate,
    avgLeadScore: 0, // Apollo doesn't provide a lead score
    staleProspects,
  };
}

// ─── Activity Feed ─────────────────────────────────────────────────────────

export interface MappedActivity {
  id: number;
  leadId: number;
  fromStage: string | null;
  toStage: string;
  trigger: string;
  notes: string | null;
  createdAt: string;
  companyName: string | null;
}

/**
 * Build a recent activity feed from Apollo emails (latest engagement events).
 */
export function buildActivityFromEmails(emails: ApolloRawEmail[]): MappedActivity[] {
  return emails
    .filter(e => e.sent_at)
    .sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? ""))
    .slice(0, 20)
    .map((e, i) => {
      let trigger = "email_sent";
      let toStage = "contacted";
      if (e.replied_at) { trigger = "email_replied"; toStage = "responded"; }
      else if (e.clicked_at) { trigger = "email_clicked"; toStage = "contacted"; }
      else if (e.opened_at) { trigger = "email_opened"; toStage = "contacted"; }
      else if (e.bounced_at) { trigger = "email_bounced"; toStage = "cold"; }

      const contactName = e.contact
        ? `${e.contact.first_name ?? ""} ${e.contact.last_name ?? ""}`.trim()
        : null;

      return {
        id: i + 1,
        leadId: 0,
        fromStage: null,
        toStage,
        trigger,
        notes: e.subject || null,
        createdAt: e.sent_at || e.created_at,
        companyName: e.contact?.organization_name ?? contactName,
      };
    });
}
