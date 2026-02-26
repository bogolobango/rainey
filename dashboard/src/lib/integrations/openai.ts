/**
 * OpenAI Integration
 *
 * Used by Lead Scout (discovery + enrichment) and other agents
 * for AI-powered content generation.
 */

// Note: The actual OpenAI integration will use the openai npm package
// This file provides the typed interface and helper functions

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const DEFAULT_CONFIG: Omit<OpenAIConfig, "apiKey"> = {
  model: "gpt-4.1-mini",
  maxTokens: 12000,
  temperature: 0.5,
};

export const ENRICHMENT_CONFIG: Omit<OpenAIConfig, "apiKey"> = {
  model: "gpt-4.1-mini",
  maxTokens: 500,
  temperature: 0.3,
};

// TODO: Implement actual OpenAI calls when API key is configured
// For now, the existing rainey.py handles this via Python
// Future: Port discovery and enrichment prompts to TypeScript
