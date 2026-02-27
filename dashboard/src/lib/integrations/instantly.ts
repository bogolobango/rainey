/**
 * Instantly.ai Integration
 *
 * Purpose: Email campaign management — create campaigns, add leads, send messages,
 *          track engagement (opens/clicks/replies).
 * API Docs: https://developer.instantly.ai/
 *
 * Endpoints:
 *   POST /api/v1/campaign/add             — Create campaign
 *   POST /api/v1/lead/add                 — Add lead to campaign
 *   GET  /api/v1/campaign/get             — Get campaign analytics
 *   POST /api/v1/campaign/status/update   — Pause / resume / complete
 */

const INSTANTLY_BASE = "https://api.instantly.ai";

function getApiKey(): string | null {
  return process.env.INSTANTLY_API_KEY || null;
}

async function instantlyFetch<T>(
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = new URL(`${INSTANTLY_BASE}${path}`);
  if (method === "GET") url.searchParams.set("api_key", apiKey);

  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (method === "POST") {
    opts.body = JSON.stringify({ api_key: apiKey, ...body });
  }

  const res = await fetch(url.toString(), opts);

  if (!res.ok) {
    console.warn(`[Instantly] ${path} failed: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json() as Promise<T>;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "drafting";
  leadsCount: number;
  sentCount: number;
  openRate: number;
  replyRate: number;
}

export interface InstantlyLead {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  customVariables?: Record<string, string>;
}

// ─── Campaign Management ────────────────────────────────────────────────────

export async function createCampaign(name: string): Promise<string | null> {
  if (!getApiKey()) {
    console.warn("[Instantly] API key not configured — skipping campaign creation");
    return null;
  }

  const data = await instantlyFetch<{ id?: string; campaign_id?: string }>(
    "/api/v1/campaign/add",
    "POST",
    { name },
  );

  return data?.id || data?.campaign_id || null;
}

export async function addLeadToCampaign(
  campaignId: string,
  lead: InstantlyLead,
): Promise<boolean> {
  if (!getApiKey()) return false;

  const data = await instantlyFetch<{ status?: string }>(
    "/api/v1/lead/add",
    "POST",
    {
      campaign_id: campaignId,
      leads: [
        {
          email: lead.email,
          first_name: lead.firstName,
          last_name: lead.lastName,
          company_name: lead.companyName,
          custom_variables: lead.customVariables || {},
        },
      ],
      skip_if_in_workspace: true,
    },
  );

  return data?.status === "success" || !!data;
}

export async function addLeadsToCampaign(
  campaignId: string,
  leads: InstantlyLead[],
): Promise<number> {
  if (!getApiKey()) return 0;

  const data = await instantlyFetch<{ status?: string; leads_uploaded?: number }>(
    "/api/v1/lead/add",
    "POST",
    {
      campaign_id: campaignId,
      leads: leads.map((lead) => ({
        email: lead.email,
        first_name: lead.firstName,
        last_name: lead.lastName,
        company_name: lead.companyName,
        custom_variables: lead.customVariables || {},
      })),
      skip_if_in_workspace: true,
    },
  );

  return data?.leads_uploaded || (data?.status === "success" ? leads.length : 0);
}

// ─── Campaign Analytics ─────────────────────────────────────────────────────

export async function getCampaignAnalytics(campaignId: string): Promise<InstantlyCampaign | null> {
  if (!getApiKey()) return null;

  const data = await instantlyFetch<{
    id?: string;
    name?: string;
    status?: string;
    leads_count?: number;
    sent_count?: number;
    open_rate?: number;
    reply_rate?: number;
  }>(`/api/v1/campaign/get?campaign_id=${encodeURIComponent(campaignId)}`, "GET");

  if (!data) return null;

  return {
    id: data.id || campaignId,
    name: data.name || "",
    status: (data.status as InstantlyCampaign["status"]) || "drafting",
    leadsCount: data.leads_count || 0,
    sentCount: data.sent_count || 0,
    openRate: data.open_rate || 0,
    replyRate: data.reply_rate || 0,
  };
}

// ─── Campaign Status ────────────────────────────────────────────────────────

export async function updateCampaignStatus(
  campaignId: string,
  status: "active" | "paused" | "completed",
): Promise<boolean> {
  if (!getApiKey()) return false;

  const statusCode = status === "active" ? 1 : status === "paused" ? 2 : 0;

  const data = await instantlyFetch<{ status?: string }>(
    "/api/v1/campaign/status/update",
    "POST",
    { campaign_id: campaignId, status: statusCode },
  );

  return !!data;
}

// ─── Launch Outreach (orchestration helper) ─────────────────────────────────

export async function launchOutreachCampaign(opts: {
  campaignName: string;
  leads: InstantlyLead[];
}): Promise<{ campaignId: string | null; leadsAdded: number }> {
  const campaignId = await createCampaign(opts.campaignName);
  if (!campaignId) return { campaignId: null, leadsAdded: 0 };

  const leadsAdded = await addLeadsToCampaign(campaignId, opts.leads);

  if (leadsAdded > 0) {
    await updateCampaignStatus(campaignId, "active");
  }

  return { campaignId, leadsAdded };
}
