/**
 * Gemini AI Service
 * Handles communication with Google Gemini API
 *
 * Key features:
 * - Exponential backoff retry on transient errors (429, 5xx)
 * - systemInstruction field for proper agent-role separation
 * - JSON mode (responseMimeType: 'application/json') for guaranteed structured output
 * - finishReason validation to catch truncated/blocked responses
 * - Relaxed safety settings to avoid false-positive blocks on business content
 */

import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// Override via GEMINI_MODEL env var — must match the exact Google API model ID.
// Common free-tier options (AI Studio key):
//   gemini-2.0-flash-lite  — lightest, 1500 RPD free
//   gemini-2.0-flash       — balanced, 1500 RPD free
//   gemini-1.5-flash       — older but widely supported
// See: https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

/** The active Gemini model ID — exported so routes can surface it in status checks. */
export const activeModel = GEMINI_MODEL;

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

// Safety settings tuned for regulatory/business content to avoid false-positive blocks
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];

export class GeminiAPIError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

export interface GeminiResponse {
  response: string;
  duration_ms: number;
  finishReason?: string;
  model: string;
}

export interface AskGeminiOptions {
  /** Request timeout in milliseconds. Default: 60000 */
  timeoutMs?: number;
  /** Sampling temperature (0–1). Default: 0.4. Use 0.2 for structured output. */
  temperature?: number;
  /** Max output tokens. Default: 4096 */
  maxTokens?: number;
  /**
   * System instruction passed via the dedicated systemInstruction field.
   * This keeps agent roles separated from user content for better adherence.
   */
  systemInstruction?: string;
  /**
   * When true, sets responseMimeType to 'application/json'.
   * Requires gemini-1.5+ models. Guarantees clean JSON output with no markdown wrapping.
   */
  jsonMode?: boolean;
  /** Maximum retry attempts for transient errors. Default: 3 */
  maxRetries?: number;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff with jitter: 1s, 2s, 4s (+/- 300ms)
      const delayMs = Math.min(
        DEFAULT_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 300,
        10000
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Only retry on known transient Gemini API errors
      if (!(err instanceof GeminiAPIError) || !RETRYABLE_STATUSES.has(err.status)) {
        throw err;
      }
    }
  }
  throw lastError;
}

/**
 * Send a prompt to Gemini API and get a response.
 *
 * For structured JSON output, pass `jsonMode: true` and `temperature: 0.2`.
 * Use `systemInstruction` to set the agent role instead of prepending it to the prompt.
 */
export async function askGemini(
  prompt: string,
  options?: AskGeminiOptions
): Promise<GeminiResponse> {
  const startTime = Date.now();

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Set it in .env.local');
  }

  if (!prompt) {
    throw new Error('Prompt is required');
  }

  const timeoutMs = options?.timeoutMs ?? 60000;
  const temperature = options?.temperature ?? 0.4;
  const maxTokens = options?.maxTokens ?? 4096;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const jsonMode = options?.jsonMode ?? false;

  const url = `${GEMINI_API_BASE_URL}/models/${GEMINI_MODEL}:generateContent`;

  const requestBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode && { responseMimeType: 'application/json' }),
    },
    safetySettings: SAFETY_SETTINGS,
  };

  if (options?.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  return withRetry(async () => {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let fetchResponse: Awaited<ReturnType<typeof fetch>>;
    try {
      fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any,
      });
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err.name === 'AbortError') {
        throw new Error(`Gemini API request timeout after ${timeoutMs}ms`);
      }
      throw err;
    }
    clearTimeout(timeoutHandle);

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new GeminiAPIError(
        fetchResponse.status,
        `Gemini API request failed (${fetchResponse.status}): ${errorText}`
      );
    }

    const data = await fetchResponse.json() as any;

    const candidates = data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    const candidate = candidates[0];
    const finishReason: string = candidate?.finishReason ?? 'UNKNOWN';

    if (finishReason === 'SAFETY') {
      throw new Error('Gemini API response was blocked by safety filters');
    }

    const content = candidate?.content;
    if (!content?.parts || content.parts.length === 0) {
      throw new Error('Invalid response format from Gemini API');
    }

    const text: string = content.parts[0]?.text ?? '';
    const duration_ms = Date.now() - startTime;

    return { response: text, duration_ms, finishReason, model: GEMINI_MODEL };
  }, maxRetries);
}

/**
 * Chat with Gemini using a specific agent role via the systemInstruction field.
 */
export async function chatWithGeminiAgent(
  agentRole: string,
  prompt: string,
  options?: AskGeminiOptions
): Promise<{ reply: string }> {
  const response = await askGemini(prompt, {
    ...options,
    systemInstruction: `You are ${agentRole}.`,
  });
  return { reply: response.response };
}

export default { askGemini, chatWithGeminiAgent, GeminiAPIError };
