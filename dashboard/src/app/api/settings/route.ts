import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/settings — Returns which integrations are configured
 * (checks for env vars without exposing their values).
 */
export async function GET() {
  const integrations: Record<string, { configured: boolean; envVar: string }> = {
    "Apollo.io": {
      configured: !!process.env.APOLLO_API_KEY,
      envVar: "APOLLO_API_KEY",
    },
    "OpenAI API": {
      configured: !!process.env.OPENAI_API_KEY,
      envVar: "OPENAI_API_KEY",
    },
    "Instantly.ai": {
      configured: !!process.env.INSTANTLY_API_KEY,
      envVar: "INSTANTLY_API_KEY",
    },
    "Google Gmail": {
      configured: !!process.env.GOOGLE_CLIENT_ID,
      envVar: "GOOGLE_CLIENT_ID",
    },
    "Google Calendar": {
      configured: !!process.env.GOOGLE_CLIENT_ID,
      envVar: "GOOGLE_CLIENT_ID",
    },
    "Google Sheets": {
      configured: !!process.env.GOOGLE_CLIENT_ID,
      envVar: "GOOGLE_CLIENT_ID",
    },
    "Google Drive": {
      configured: !!process.env.GOOGLE_CLIENT_ID,
      envVar: "GOOGLE_CLIENT_ID",
    },
    "Google Maps": {
      configured: !!process.env.GOOGLE_MAPS_API_KEY,
      envVar: "GOOGLE_MAPS_API_KEY",
    },
    "Telegram": {
      configured: !!process.env.TELEGRAM_BOT_TOKEN,
      envVar: "TELEGRAM_BOT_TOKEN",
    },
  };

  return NextResponse.json({ integrations });
}

/**
 * POST /api/settings — Test an integration's connectivity.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, integration } = body as { action: string; integration?: string };

  if (action === "test" && integration) {
    const result = await testIntegration(integration);
    return NextResponse.json(result);
  }

  if (action === "test_all") {
    const results: Record<string, { ok: boolean; message: string }> = {};
    for (const name of [
      "Apollo.io", "OpenAI API", "Instantly.ai",
      "Google Gmail", "Google Calendar",
      "Telegram",
    ]) {
      results[name] = await testIntegration(name);
    }
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function testIntegration(name: string): Promise<{ ok: boolean; message: string }> {
  try {
    switch (name) {
      case "Apollo.io": {
        const key = process.env.APOLLO_API_KEY;
        if (!key) return { ok: false, message: "APOLLO_API_KEY not set. Add it in Vercel → Settings → Environment Variables." };
        const res = await fetch("https://api.apollo.io/v1/auth/health", {
          headers: { "x-api-key": key, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          return data.is_logged_in
            ? { ok: true, message: "Connected — API key is valid" }
            : { ok: false, message: "API key is invalid" };
        }
        return { ok: false, message: `Apollo returned ${res.status}` };
      }

      case "OpenAI API": {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return { ok: false, message: "OPENAI_API_KEY not set. Add it in Vercel → Settings → Environment Variables." };
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return res.ok
          ? { ok: true, message: "Connected — API key is valid" }
          : { ok: false, message: `OpenAI returned ${res.status}` };
      }

      case "Instantly.ai": {
        const key = process.env.INSTANTLY_API_KEY;
        if (!key) return { ok: false, message: "INSTANTLY_API_KEY not set. Add it in Vercel → Settings → Environment Variables." };
        return { ok: true, message: "API key configured (connection test requires campaign)" };
      }

      case "Google Gmail":
      case "Google Calendar":
      case "Google Sheets":
      case "Google Drive": {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return { ok: false, message: "GOOGLE_CLIENT_ID not set. Add it in Vercel → Settings → Environment Variables." };
        return { ok: true, message: "OAuth credentials configured" };
      }

      case "Google Maps": {
        const key = process.env.GOOGLE_MAPS_API_KEY;
        if (!key) return { ok: false, message: "GOOGLE_MAPS_API_KEY not set." };
        return { ok: true, message: "API key configured" };
      }

      case "Telegram": {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return { ok: false, message: "TELEGRAM_BOT_TOKEN not set." };
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        if (res.ok) {
          const data = await res.json();
          return { ok: true, message: `Connected as @${data.result?.username ?? "bot"}` };
        }
        return { ok: false, message: "Invalid bot token" };
      }

      default:
        return { ok: false, message: "Unknown integration" };
    }
  } catch (error) {
    return { ok: false, message: `Connection failed: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}
