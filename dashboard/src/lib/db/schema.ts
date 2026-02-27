import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Leads ───────────────────────────────────────────────────────────────────
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  website: text("website"),
  vertical: text("vertical").notNull(), // indoor_sports | med_spa | dental | youth_sports
  tier: text("tier").notNull().default("tier_1"), // tier_1 | tier_2
  locationCount: integer("location_count").notNull().default(1),
  locationCitiesStates: text("location_cities_states"),
  bookingPlatform: text("booking_platform"),
  googleRating: real("google_rating"),
  googleReviewCount: integer("google_review_count"),
  annualRevenue: text("annual_revenue"),
  employeeCount: text("employee_count"),
  score: real("score").notNull().default(0),
  scoreBreakdown: text("score_breakdown"), // JSON
  // Decision maker
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  linkedinCompany: text("linkedin_company"),
  linkedinPersonal: text("linkedin_personal"),
  // Pipeline
  pipelineStage: text("pipeline_stage").notNull().default("cold"),
  // Pain signals & research
  painSignals: text("pain_signals"), // JSON array
  research: text("research"),
  // Source tracking
  source: text("source").notNull().default("lead_scout"),
  // Timestamps
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Outreach Messages ───────────────────────────────────────────────────────
export const outreachMessages = sqliteTable("outreach_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  channel: text("channel").notNull(), // email | linkedin | phone
  templateId: text("template_id"),
  subject: text("subject"),
  body: text("body").notNull(),
  personalizationNotes: text("personalization_notes"),
  roiCalculation: text("roi_calculation"),
  status: text("status").notNull().default("draft"),
  sequenceDay: integer("sequence_day").notNull().default(0),
  scheduledAt: text("scheduled_at"),
  sentAt: text("sent_at"),
  openedAt: text("opened_at"),
  clickedAt: text("clicked_at"),
  repliedAt: text("replied_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Pipeline Events (audit log) ─────────────────────────────────────────────
export const pipelineEvents = sqliteTable("pipeline_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  trigger: text("trigger").notNull(), // e.g. "email_reply", "manual", "calendar_event"
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Agent Runs (execution log) ──────────────────────────────────────────────
export const agentRuns = sqliteTable("agent_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentType: text("agent_type").notNull(),
  status: text("status").notNull().default("running"), // running | completed | failed
  startedAt: text("started_at").notNull().default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  summary: text("summary"),
  errorLog: text("error_log"),
});

// ─── Daily Briefings ─────────────────────────────────────────────────────────
export const dailyBriefings = sqliteTable("daily_briefings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // morning | evening
  content: text("content").notNull(),
  generatedAt: text("generated_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Call Prep Docs ──────────────────────────────────────────────────────────
export const callPreps = sqliteTable("call_preps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  callDate: text("call_date").notNull(),
  companySnapshot: text("company_snapshot").notNull(),
  painSignals: text("pain_signals_detail").notNull(),
  financialModel: text("financial_model").notNull(),
  killerQuestions: text("killer_questions").notNull(), // JSON array
  objectionHandles: text("objection_handles").notNull(), // JSON
  recommendedCaseStudy: text("recommended_case_study").notNull(),
  competitiveIntel: text("competitive_intel").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Proposals ───────────────────────────────────────────────────────────────
export const proposals = sqliteTable("proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  executiveSummary: text("executive_summary").notNull(),
  currentStateAnalysis: text("current_state_analysis").notNull(),
  proposedSolution: text("proposed_solution").notNull(),
  financialModel: text("financial_model").notNull(),
  implementationTimeline: text("implementation_timeline").notNull(),
  caseStudy: text("case_study").notNull(),
  pricing: text("pricing").notNull(),
  nextSteps: text("next_steps").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── Follow-Up Sequences ─────────────────────────────────────────────────────
export const followUpSequences = sqliteTable("follow_up_sequences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  currentDay: integer("current_day").notNull().default(0),
  status: text("status").notNull().default("active"), // active | paused | completed | exited
  nextTouchAt: text("next_touch_at"),
  channelHistory: text("channel_history"), // JSON array of channels used
  pausedUntil: text("paused_until"), // for OOO detection
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
