/**
 * Notification Delivery — Slack + Telegram
 *
 * Pushes alerts, briefings, and hot lead notifications to Jim.
 * Supports Slack webhooks and Telegram bot API.
 *
 * Env vars:
 *   SLACK_WEBHOOK_URL  — Slack incoming webhook URL
 *   TELEGRAM_BOT_TOKEN — Telegram bot token
 *   TELEGRAM_CHAT_ID   — Telegram chat/group ID to send to
 */

interface NotificationPayload {
  title: string;
  body: string;
  urgent?: boolean;
}

async function sendSlack(payload: NotificationPayload): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;

  const emoji = payload.urgent ? ":rotating_light:" : ":robot_face:";
  const text = `${emoji} *${payload.title}*\n\n${payload.body}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return res.ok;
}

async function sendTelegram(payload: NotificationPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const prefix = payload.urgent ? "🚨" : "🤖";
  const text = `${prefix} *${payload.title}*\n\n${payload.body}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  return res.ok;
}

/**
 * Send a notification to all configured channels.
 * Silently fails if no channels are configured — callers should .catch(() => {}).
 */
export async function sendNotification(payload: NotificationPayload): Promise<{
  slack: boolean;
  telegram: boolean;
}> {
  const [slack, telegram] = await Promise.all([
    sendSlack(payload).catch(() => false),
    sendTelegram(payload).catch(() => false),
  ]);

  if (!slack && !telegram) {
    console.warn("[Notifications] No channels configured or all sends failed");
  }

  return { slack, telegram };
}
