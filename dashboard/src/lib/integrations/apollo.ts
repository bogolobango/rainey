/**
 * Apollo.io Integration
 *
 * Purpose: Lead enrichment, verified email finding, contact data, bounce recovery.
 * API Docs: https://apolloio.github.io/apollo-api-docs/
 *
 * Endpoints used:
 *   POST /v1/organizations/enrich  — Enrich company data
 *   POST /v1/people/match          — Find decision maker by company + title
 *   POST /v1/people/search         — Search contacts by domain + seniority
 */

const APOLLO_BASE = "https://api.apollo.io";

function getApiKey(): string | null {
  return process.env.APOLLO_API_KEY || null;
}

async function apolloFetch<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const res = await fetch(`${APOLLO_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.warn(`[Apollo] ${path} failed: ${res.status} ${res.statusText}`);
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
