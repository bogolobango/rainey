/**
 * Apollo.io Integration
 *
 * Purpose: Lead enrichment, verified email finding, contact data, bounce recovery,
 *          and LIVE sequence / outreach data for the dashboard.
 *
 * API Docs: https://docs.apollo.io/
 *
 * Endpoints used:
 *   POST /v1/organizations/enrich            — Enrich company data
 *   POST /v1/people/match                    — Find decision maker by company + title
 *   POST /v1/people/search                   — Search contacts by domain + seniority
 *   POST /api/v1/emailer_campaigns/search    — Search for sequences (master key)
 *   POST /api/v1/contacts/search             — Search contacts (filter by sequence)
 *   POST /api/v1/emailer_messages/search     — Search outreach emails by sequence
 */

const APOLLO_BASE = "https://api.apollo.io";

function getApiKey(): string | null {
  return process.env.APOLLO_API_KEY || null;
}

export function isApolloConfigured(): boolean {
  return !!getApiKey();
}

async function apolloFetch<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = path.startsWith("/api/")
    ? `${APOLLO_BASE}${path}`
    : `${APOLLO_BASE}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.warn(`[Apollo] ${path} failed: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json() as Promise<T>;
}

async function apolloGet<T>(path: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const res = await fetch(`${APOLLO_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    console.warn(`[Apollo] GET ${path} failed: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json() as Promise<T>;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApolloContact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  emailStatus: "verified" | "guessed" | "unavailable" | null;
  phone: string | null;
  linkedinUrl: string | null;
  organizationName: string;
  organizationWebsite: string | null;
}

export interface ApolloEnrichmentResult {
  contact: ApolloContact | null;
  organization: {
    name: string;
    website: string;
    employeeCount: number | null;
    annualRevenue: number | null;
    industry: string | null;
    linkedinUrl: string | null;
  } | null;
}

/** Raw Apollo sequence object (emailer_campaign). */
export interface ApolloSequence {
  id: string;
  name: string;
  active: boolean;
  archived: boolean;
  created_at: string;
  num_steps: number;
  user_id: string;
  unique_scheduled: number;
  unique_delivered: number;
  unique_bounced: number;
  unique_opened: number;
  unique_replied: number;
  unique_demoed: number;
  bounce_rate: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  spam_blocked_rate: number;
  opt_out_rate: number;
  demo_rate: number;
  // Steps
  emailer_steps?: ApolloSequenceStep[];
  label_ids?: string[];
}

export interface ApolloSequenceStep {
  id: string;
  emailer_campaign_id: string;
  position: number;
  type: string; // "auto_email", "manual_email", "call", "task", "linkedin_*"
  wait_time: number; // days to wait before this step
  note?: string;
  exact_datetime?: string;
  priority?: string;
  subject_template?: string;
  body_template?: string;
}

/** Raw Apollo contact from contacts/search. */
export interface ApolloRawContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string;
  email_status: string;
  phone_numbers?: Array<{ sanitized_number?: string; type?: string }>;
  sanitized_phone?: string;
  linkedin_url: string | null;
  organization_name: string;
  organization_id: string;
  account_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  label_names?: string[];
  contact_stage_id?: string;
  typed_custom_fields?: Record<string, unknown>;
  account?: {
    id: string;
    name: string;
    website_url: string;
    domain: string;
    phone: string;
    industry: string;
    linkedin_url: string;
  };
  emailer_campaign_ids?: string[];
  contact_campaign_statuses?: Array<{
    id: string;
    emailer_campaign_id: string;
    send_email_from_email_account_id: string;
    status: string; // "active", "paused", "finished", "bounced", "not_sent"
    added_at: string;
    finished_at?: string;
    added_by_user_id: string;
  }>;
}

/** Raw Apollo outreach email (emailer_message). */
export interface ApolloRawEmail {
  id: string;
  emailer_campaign_id: string;
  emailer_step_id: string;
  contact_id: string;
  email_account_id: string;
  status: string; // "sent", "delivered", "opened", "clicked", "replied", "bounced"
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  created_at: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  contact?: ApolloRawContact;
}

/** Contact stage mapping from Apollo. */
export interface ApolloContactStage {
  id: string;
  team_id: string;
  display_name: string;
  name: string;
  display_order: number;
}

// ─── In-memory cache (60s TTL) ─────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Sequence Endpoints ────────────────────────────────────────────────────

/**
 * Search for sequences (Apollo calls them "emailer_campaigns").
 * Returns active sequences by default.
 */
export async function searchSequences(opts?: {
  activeOnly?: boolean;
}): Promise<ApolloSequence[]> {
  const cacheKey = `sequences:${opts?.activeOnly ?? true}`;
  const cached = getCached<ApolloSequence[]>(cacheKey);
  if (cached) return cached;

  const data = await apolloFetch<{
    emailer_campaigns?: ApolloSequence[];
  }>("/api/v1/emailer_campaigns/search", {
    per_page: 50,
    page: 1,
  });

  if (!data?.emailer_campaigns) return [];

  let sequences = data.emailer_campaigns;
  if (opts?.activeOnly !== false) {
    sequences = sequences.filter(s => s.active && !s.archived);
  }

  setCache(cacheKey, sequences);
  return sequences;
}

/**
 * Get details for a single sequence by ID, including steps.
 */
export async function getSequence(sequenceId: string): Promise<ApolloSequence | null> {
  const cacheKey = `sequence:${sequenceId}`;
  const cached = getCached<ApolloSequence>(cacheKey);
  if (cached) return cached;

  const data = await apolloGet<{
    emailer_campaign?: ApolloSequence;
  }>(`/api/v1/emailer_campaigns/${sequenceId}`);

  if (!data?.emailer_campaign) return null;

  setCache(cacheKey, data.emailer_campaign);
  return data.emailer_campaign;
}

// ─── Contact Endpoints ─────────────────────────────────────────────────────

/**
 * Search for contacts enrolled in specific sequences.
 * Uses `emailer_campaign_ids` to filter by sequence membership.
 */
export async function searchContactsBySequence(
  sequenceIds: string[],
  opts?: { page?: number; perPage?: number },
): Promise<{ contacts: ApolloRawContact[]; totalEntries: number; page: number }> {
  const page = opts?.page ?? 1;
  const perPage = opts?.perPage ?? 100;
  const cacheKey = `contacts:${sequenceIds.join(",")}:${page}:${perPage}`;
  const cached = getCached<{ contacts: ApolloRawContact[]; totalEntries: number; page: number }>(cacheKey);
  if (cached) return cached;

  const data = await apolloFetch<{
    contacts?: ApolloRawContact[];
    pagination?: { total_entries?: number; page?: number; per_page?: number };
  }>("/api/v1/contacts/search", {
    emailer_campaign_ids: sequenceIds,
    page,
    per_page: perPage,
  });

  const result = {
    contacts: data?.contacts ?? [],
    totalEntries: data?.pagination?.total_entries ?? 0,
    page,
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch ALL contacts across multiple sequences (handles pagination).
 */
export async function getAllSequenceContacts(
  sequenceIds: string[],
): Promise<ApolloRawContact[]> {
  const cacheKey = `all-contacts:${sequenceIds.join(",")}`;
  const cached = getCached<ApolloRawContact[]>(cacheKey);
  if (cached) return cached;

  const allContacts: ApolloRawContact[] = [];
  let page = 1;
  const perPage = 100;

  // Fetch up to 5 pages (500 contacts) to stay within rate limits
  while (page <= 5) {
    const result = await searchContactsBySequence(sequenceIds, { page, perPage });
    allContacts.push(...result.contacts);
    if (result.contacts.length < perPage) break;
    page++;
  }

  setCache(cacheKey, allContacts);
  return allContacts;
}

// ─── Outreach Email Endpoints ──────────────────────────────────────────────

/**
 * Search for outreach emails (emailer_messages) sent from a sequence.
 */
export async function searchOutreachEmails(
  sequenceIds: string[],
  opts?: { page?: number; perPage?: number },
): Promise<{ emails: ApolloRawEmail[]; totalEntries: number }> {
  const page = opts?.page ?? 1;
  const perPage = opts?.perPage ?? 50;
  const cacheKey = `emails:${sequenceIds.join(",")}:${page}`;
  const cached = getCached<{ emails: ApolloRawEmail[]; totalEntries: number }>(cacheKey);
  if (cached) return cached;

  const data = await apolloFetch<{
    emailer_messages?: ApolloRawEmail[];
    pagination?: { total_entries?: number };
  }>("/api/v1/emailer_messages/search", {
    emailer_campaign_ids: sequenceIds,
    page,
    per_page: perPage,
  });

  const result = {
    emails: data?.emailer_messages ?? [],
    totalEntries: data?.pagination?.total_entries ?? 0,
  };

  setCache(cacheKey, result);
  return result;
}

// ─── Contact Stages ────────────────────────────────────────────────────────

/**
 * Get all contact stages for the account (maps stage IDs to names).
 */
export async function getContactStages(): Promise<ApolloContactStage[]> {
  const cacheKey = "contact-stages";
  const cached = getCached<ApolloContactStage[]>(cacheKey);
  if (cached) return cached;

  const data = await apolloGet<{
    contact_stages?: ApolloContactStage[];
  }>("/api/v1/contact_stages");

  const stages = data?.contact_stages ?? [];
  setCache(cacheKey, stages);
  return stages;
}

// ─── Aggregated Dashboard Data ─────────────────────────────────────────────

export interface ApolloSequenceOverview {
  id: string;
  name: string;
  active: boolean;
  numSteps: number;
  totalContacts: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  demoed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  demoRate: number;
}

/**
 * Get a summary of all active sequences — used by the dashboard stats route.
 */
export async function getActiveSequenceOverviews(): Promise<ApolloSequenceOverview[]> {
  const sequences = await searchSequences({ activeOnly: true });

  return sequences.map((s) => ({
    id: s.id,
    name: s.name,
    active: s.active,
    numSteps: s.num_steps,
    totalContacts: s.unique_scheduled,
    delivered: s.unique_delivered,
    opened: s.unique_opened,
    replied: s.unique_replied,
    bounced: s.unique_bounced,
    demoed: s.unique_demoed,
    openRate: s.open_rate,
    clickRate: s.click_rate,
    replyRate: s.reply_rate,
    bounceRate: s.bounce_rate,
    demoRate: s.demo_rate,
  }));
}

// ─── Organization Enrichment ────────────────────────────────────────────────

export async function enrichOrganization(domain: string): Promise<ApolloEnrichmentResult["organization"]> {
  if (!getApiKey()) {
    console.warn("[Apollo] API key not configured — skipping org enrichment");
    return null;
  }

  const data = await apolloFetch<{
    organization?: {
      name?: string;
      website_url?: string;
      estimated_num_employees?: number;
      annual_revenue?: number;
      industry?: string;
      linkedin_url?: string;
    };
  }>("/v1/organizations/enrich", { domain });

  if (!data?.organization) return null;
  const org = data.organization;

  return {
    name: org.name || domain,
    website: org.website_url || `https://${domain}`,
    employeeCount: org.estimated_num_employees || null,
    annualRevenue: org.annual_revenue || null,
    industry: org.industry || null,
    linkedinUrl: org.linkedin_url || null,
  };
}

// ─── Lead Enrichment (company + contact) ────────────────────────────────────

export async function enrichLead(companyName: string, website: string): Promise<ApolloEnrichmentResult | null> {
  if (!getApiKey()) {
    console.warn("[Apollo] API key not configured — skipping enrichment");
    return null;
  }

  const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const organization = await enrichOrganization(domain);

  // Search for a decision maker at this company
  const contact = await findDecisionMaker(companyName, [
    "Owner", "CEO", "Founder", "General Manager",
    "VP Operations", "Director of Operations", "COO",
  ]);

  return { contact, organization };
}

// ─── Find Decision Maker ────────────────────────────────────────────────────

export async function findDecisionMaker(
  companyName: string,
  titles: string[],
): Promise<ApolloContact | null> {
  if (!getApiKey()) return null;

  const data = await apolloFetch<{
    people?: Array<{
      id?: string;
      first_name?: string;
      last_name?: string;
      title?: string;
      email?: string;
      email_status?: string;
      phone_numbers?: Array<{ sanitized_number?: string }>;
      linkedin_url?: string;
      organization_name?: string;
      organization?: { website_url?: string };
    }>;
  }>("/v1/people/search", {
    q_organization_name: companyName,
    person_titles: titles,
    person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
    page: 1,
    per_page: 3,
  });

  if (!data?.people?.length) return null;

  // Pick the best match — prefer verified emails
  const sorted = [...data.people].sort((a, b) => {
    if (a.email_status === "verified" && b.email_status !== "verified") return -1;
    if (b.email_status === "verified" && a.email_status !== "verified") return 1;
    return 0;
  });

  const p = sorted[0];
  if (!p.first_name || !p.last_name) return null;

  return {
    id: p.id || "",
    firstName: p.first_name,
    lastName: p.last_name,
    title: p.title || "",
    email: p.email || "",
    emailStatus: (p.email_status as ApolloContact["emailStatus"]) || null,
    phone: p.phone_numbers?.[0]?.sanitized_number || null,
    linkedinUrl: p.linkedin_url || null,
    organizationName: p.organization_name || companyName,
    organizationWebsite: p.organization?.website_url || null,
  };
}

// ─── Find Alternate Email (Bounce Recovery) ─────────────────────────────────

export async function findAlternateEmail(
  firstName: string,
  lastName: string,
  companyDomain: string,
): Promise<string | null> {
  if (!getApiKey()) return null;

  const data = await apolloFetch<{
    matches?: Array<{
      email?: string;
      email_status?: string;
    }>;
  }>("/v1/people/match", {
    first_name: firstName,
    last_name: lastName,
    organization_domain: companyDomain,
    reveal_personal_emails: false,
  });

  if (!data?.matches?.length) return null;

  for (const match of data.matches) {
    if (match.email && (match.email_status === "verified" || match.email_status === "guessed")) {
      return match.email;
    }
  }

  return null;
}
