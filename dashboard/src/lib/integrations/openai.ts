/**
 * OpenAI Integration
 *
 * Ported from rainey.py — provides GPT-powered lead discovery and enrichment.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  _client = new OpenAI({ apiKey });
  return _client;
}

export const MODEL = "gpt-4.1-mini";

/**
 * Call OpenAI chat completions and return the text response.
 * Strips markdown fences if the model wraps JSON in ```json blocks.
 */
export async function chatJSON<T>(opts: {
  system?: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = getOpenAIClient();

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.maxTokens ?? 12000,
  });

  let raw = response.choices[0].message.content?.trim() ?? "";

  // Strip markdown fences if present (```json ... ```)
  if (raw.startsWith("```")) {
    const lines = raw.split("\n");
    const lastLine = lines[lines.length - 1].trim();
    raw = lastLine === "```"
      ? lines.slice(1, -1).join("\n")
      : lines.slice(1).join("\n");
  }

  return JSON.parse(raw) as T;
}
