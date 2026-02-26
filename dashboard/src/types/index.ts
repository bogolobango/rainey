// ─── Pipeline Stages ─────────────────────────────────────────────────────────
export const PIPELINE_STAGES = [
  "cold",
  "contacted",
  "responded",
  "discovery_booked",
  "demo_completed",
  "proposal_sent",
  "negotiating",
  "closed_won",
  "closed_lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  cold: "Cold",
  contacted: "Contacted",
  responded: "Responded",
  discovery_booked: "Discovery Booked",
  demo_completed: "Demo Completed",
  proposal_sent: "Proposal Sent",
  negotiating: "Negotiating",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

// ─── Verticals ───────────────────────────────────────────────────────────────
export const VERTICALS = [
  "indoor_sports",
  "med_spa",
  "dental",
  "youth_sports",
] as const;

export type Vertical = (typeof VERTICALS)[number];

export const VERTICAL_LABELS: Record<Vertical, string> = {
  indoor_sports: "Indoor Sports Facility",
  med_spa: "Med Spa & Longevity Clinic",
  dental: "Dental Practice",
  youth_sports: "Youth Sports Academy",
};

// ─── Outreach Channels ───────────────────────────────────────────────────────
export const CHANNELS = ["email", "linkedin", "phone"] as const;
export type Channel = (typeof CHANNELS)[number];

// ─── Lead Tiers ──────────────────────────────────────────────────────────────
export const TIERS = ["tier_1", "tier_2"] as const;
export type Tier = (typeof TIERS)[number];

// ─── Message Status ──────────────────────────────────────────────────────────
export const MESSAGE_STATUSES = [
  "draft",
  "approved",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "replied",
  "bounced",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

// ─── Agent Types ─────────────────────────────────────────────────────────────
export const AGENT_TYPES = [
  "lead_scout",
  "outreach_composer",
  "pipeline_intelligence",
  "prospect_research",
  "follow_up_sequencing",
  "proposal_generator",
] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_LABELS: Record<AgentType, string> = {
  lead_scout: "Lead Scout",
  outreach_composer: "Outreach Composer",
  pipeline_intelligence: "Pipeline Intelligence",
  prospect_research: "Prospect Research",
  follow_up_sequencing: "Follow-Up Sequencing",
  proposal_generator: "Proposal Generator",
};

// ─── Data Models (mirrors DB schema) ─────────────────────────────────────────

export interface Lead {
  id: number;
  companyName: string;
  website: string | null;
  vertical: Vertical;
  tier: Tier;
  locationCount: number;
  locationCitiesStates: string | null;
  bookingPlatform: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  annualRevenue: string | null;
  employeeCount: string | null;
  score: number;
  scoreBreakdown: Record<string, number> | null;
  // Decision maker
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinCompany: string | null;
  linkedinPersonal: string | null;
  // Pipeline
  pipelineStage: PipelineStage;
  // Pain signals
  painSignals: string[];
  research: string | null;
  // Metadata
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachMessage {
  id: number;
  leadId: number;
  channel: Channel;
  templateId: string | null;
  subject: string | null;
  body: string;
  personalizationNotes: string | null;
  roiCalculation: string | null;
  status: MessageStatus;
  sequenceDay: number;
  scheduledAt: string | null;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  createdAt: string;
  lead?: Lead;
}

export interface PipelineEvent {
  id: number;
  leadId: number;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  trigger: string;
  notes: string | null;
  createdAt: string;
}

export interface AgentRun {
  id: number;
  agentType: AgentType;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  itemsProcessed: number;
  itemsFailed: number;
  summary: string | null;
  errorLog: string | null;
}

export interface DailyBriefing {
  id: number;
  type: "morning" | "evening";
  content: string;
  generatedAt: string;
}

export interface CallPrep {
  id: number;
  leadId: number;
  callDate: string;
  companySnapshot: string;
  painSignals: string;
  financialModel: string;
  killerQuestions: string[];
  objectionHandles: Record<string, string>;
  recommendedCaseStudy: string;
  competitiveIntel: string;
  createdAt: string;
}

export interface Proposal {
  id: number;
  leadId: number;
  executiveSummary: string;
  currentStateAnalysis: string;
  proposedSolution: string;
  financialModel: string;
  implementationTimeline: string;
  caseStudy: string;
  pricing: string;
  nextSteps: string;
  status: "draft" | "reviewed" | "sent";
  createdAt: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
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
