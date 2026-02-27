/**
 * Google Workspace Integration
 *
 * Gmail API: Monitor inbox for replies, OOO, bounces (read-only)
 * Calendar API: Detect meetings with prospects (read-only)
 * Sheets API: Primary data layer for pipeline data
 * Docs API: Generate call prep docs, proposals, briefings
 * Drive API: Organize prospect folders
 * Maps API: Business discovery and verification
 */

// ─── Gmail (Read-Only) ──────────────────────────────────────────────────────
export interface GmailReply {
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  isOutOfOffice: boolean;
  isBounce: boolean;
}

export async function checkForReplies(_since: Date): Promise<GmailReply[]> {
  // TODO: Implement Gmail API read-only monitoring
  // Never send emails directly — all sends go through Jim or Instantly
  console.warn("[Gmail] Not yet configured — skipping reply check");
  return [];
}

// ─── Calendar (Read-Only) ────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  summary: string;
  attendees: string[];
  startTime: string;
  endTime: string;
}

export async function getUpcomingMeetings(_days: number = 7): Promise<CalendarEvent[]> {
  // TODO: Implement Calendar API read-only monitoring
  console.warn("[Calendar] Not yet configured — skipping meeting check");
  return [];
}

// ─── Google Maps ─────────────────────────────────────────────────────────────
export interface MapsBusinessResult {
  name: string;
  placeId: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  phone: string | null;
  types: string[];
}

export async function searchBusinesses(
  _query: string,
  _location: string,
  _radius: number = 50000
): Promise<MapsBusinessResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[Maps] API key not configured — skipping business search");
    return [];
  }
  // TODO: Implement Google Maps Places API
  return [];
}

// ─── Google Sheets ───────────────────────────────────────────────────────────
// Note: The primary data layer for this system uses SQLite (local DB)
// Google Sheets integration is for Jim's visibility and manual overrides
// Sheets sync will be implemented as a secondary output channel

export async function syncToSheet(_sheetId: string, _tabName: string, _data: Record<string, unknown>[]): Promise<boolean> {
  console.warn("[Sheets] Not yet configured — data stored in local DB");
  return false;
}

// ─── Google Drive ────────────────────────────────────────────────────────────
export async function createProspectFolder(_companyName: string): Promise<string | null> {
  console.warn("[Drive] Not yet configured");
  return null;
}

export async function saveDocument(_folderId: string, _name: string, _content: string): Promise<string | null> {
  console.warn("[Drive] Not yet configured");
  return null;
}
