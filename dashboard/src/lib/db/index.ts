import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;
let _sqlDb: SqlJsDatabase | null = null;
let _initPromise: Promise<DrizzleDB> | null = null;

/**
 * Optionally persist to /tmp (Vercel) or ./data (local dev).
 * Uses dynamic require("fs") so the module doesn't break when bundled
 * for environments without fs (edge, client tree-shaking, etc.).
 */
function tryLoadFromDisk(): Buffer | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const isVercel = !!process.env.VERCEL;
    const dataDir = isVercel ? "/tmp" : path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "bdr.db");
    if (fs.existsSync(dbPath)) return fs.readFileSync(dbPath);
  } catch {
    // fs unavailable (edge runtime, etc.) — start fresh
  }
  return null;
}

async function initDatabase(): Promise<DrizzleDB> {
  if (_db) return _db;

  const SQL = await initSqlJs();

  // Try loading persisted database from disk; fall back to fresh in-memory DB
  const buffer = tryLoadFromDisk();
  if (buffer) {
    try {
      _sqlDb = new SQL.Database(buffer);
    } catch {
      _sqlDb = new SQL.Database();
    }
  } else {
    _sqlDb = new SQL.Database();
  }

  _db = drizzle(_sqlDb, { schema });

  // Initialize tables
  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      website TEXT,
      vertical TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'tier_1',
      location_count INTEGER NOT NULL DEFAULT 1,
      location_cities_states TEXT,
      booking_platform TEXT,
      google_rating REAL,
      google_review_count INTEGER,
      annual_revenue TEXT,
      employee_count TEXT,
      score REAL NOT NULL DEFAULT 0,
      score_breakdown TEXT,
      first_name TEXT,
      last_name TEXT,
      title TEXT,
      email TEXT,
      phone TEXT,
      linkedin_company TEXT,
      linkedin_personal TEXT,
      pipeline_stage TEXT NOT NULL DEFAULT 'cold',
      pain_signals TEXT,
      research TEXT,
      source TEXT NOT NULL DEFAULT 'lead_scout',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outreach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      channel TEXT NOT NULL,
      template_id TEXT,
      subject TEXT,
      body TEXT NOT NULL,
      personalization_notes TEXT,
      roi_calculation TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      sequence_day INTEGER NOT NULL DEFAULT 0,
      scheduled_at TEXT,
      sent_at TEXT,
      opened_at TEXT,
      clicked_at TEXT,
      replied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pipeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      trigger TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      items_processed INTEGER NOT NULL DEFAULT 0,
      items_failed INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      error_log TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS call_preps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      call_date TEXT NOT NULL,
      company_snapshot TEXT NOT NULL,
      pain_signals_detail TEXT NOT NULL,
      financial_model TEXT NOT NULL,
      killer_questions TEXT NOT NULL,
      objection_handles TEXT NOT NULL,
      recommended_case_study TEXT NOT NULL,
      competitive_intel TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      executive_summary TEXT NOT NULL,
      current_state_analysis TEXT NOT NULL,
      proposed_solution TEXT NOT NULL,
      financial_model TEXT NOT NULL,
      implementation_timeline TEXT NOT NULL,
      case_study TEXT NOT NULL,
      pricing TEXT NOT NULL,
      next_steps TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_up_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      current_day INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      next_touch_at TEXT,
      channel_history TEXT,
      paused_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_stage);
    CREATE INDEX IF NOT EXISTS idx_leads_vertical ON leads(vertical);
    CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
    CREATE INDEX IF NOT EXISTS idx_outreach_lead_id ON outreach_messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_messages(status);
    CREATE INDEX IF NOT EXISTS idx_pipeline_events_lead_id ON pipeline_events(lead_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_type ON agent_runs(agent_type);
    CREATE INDEX IF NOT EXISTS idx_follow_up_lead_id ON follow_up_sequences(lead_id);
  `);

  // Check if needs seeding
  const result = _sqlDb.exec("SELECT count(*) as c FROM leads");
  const count = (result[0]?.values[0]?.[0] as number) ?? 0;
  if (count === 0) {
    _needsSeed = true;
  }

  // Persist to disk
  saveToFile();

  return _db;
}

/** Persist the in-memory sql.js database to disk (best-effort). */
export function saveToFile(): void {
  if (!_sqlDb) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const isVercel = !!process.env.VERCEL;
    const dataDir = isVercel ? "/tmp" : path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "bdr.db");
    const data = _sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch {
    // Ignore write errors (e.g. read-only filesystem, edge runtime)
  }
}

let _needsSeed = false;
let _seedStarted = false;

/** Returns true if the database was just created and needs seeding. */
export function checkAndClearSeedFlag(): boolean {
  if (_needsSeed && !_seedStarted) {
    _seedStarted = true;
    _needsSeed = false;
    return true;
  }
  return false;
}

/**
 * Get the initialized drizzle DB instance.
 * Must be awaited on first call (async init for sql.js WASM).
 */
export async function getDb(): Promise<DrizzleDB> {
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = initDatabase();
  }
  return _initPromise;
}

/**
 * Backward-compatible synchronous export.
 * The proxy routes all property access through the initialized _db singleton.
 * API routes MUST call `await getDb()` once before using this.
 */
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    if (!_db) {
      throw new Error(
        "Database not initialized. Call `await getDb()` first in your API route handler.",
      );
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
