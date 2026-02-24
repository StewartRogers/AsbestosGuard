/**
 * Gemini AI Service
 * Handles communication with Google Gemini API
 */

import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';
const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiResponse {
  response: string;
  duration_ms: number;
}

export interface AskGeminiOptions {
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a prompt to Gemini API and get a response
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
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2048;

  // Key is passed via header, not URL query param, to avoid leaking it in logs
  const url = `${GEMINI_API_BASE_URL}/models/${GEMINI_MODEL}:generateContent`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      }),
      signal: controller.signal as any
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    
    // Extract text from Gemini response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    const content = candidates[0]?.content;
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('Invalid response format from Gemini API');
    }

    const text = content.parts[0]?.text || '';
    const duration_ms = Date.now() - startTime;

    return {
      response: text,
      duration_ms
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Gemini API request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Chat with Gemini using a specific agent role
 */
export async function chatWithGeminiAgent(
  agentRole: string,
  prompt: string,
  options?: AskGeminiOptions
): Promise<{ reply: string }> {
  const systemPrompt = `You are ${agentRole}. ${prompt}`;
  const response = await askGemini(systemPrompt, options);
  return { reply: response.response };
}

export default { askGemini, chatWithGeminiAgent };
