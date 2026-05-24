import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Current Groq production models (Nov 2024+)
// Reference: https://console.groq.com/docs/models
export const MODELS = {
  FAST: "llama-3.1-8b-instant",
  BALANCED: "llama-3.3-70b-versatile",
  LARGE: "llama-3.3-70b-versatile",
  CHAT_FALLBACKS: [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
  ],
  EXTRACTION_FALLBACKS: [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
  ],
};

export interface AIOptions {
  model?: string;
  fallbackChain?: string[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface AIError extends Error {
  isRateLimit?: boolean;
  retryAfter?: number;
}

function parseError(err: any): { isRateLimit: boolean; isDecommissioned: boolean; retryAfter?: number; message: string } {
  const msg = err?.message || String(err);
  const status = err?.status;

  if (msg.includes("decommissioned") || msg.includes("model_not_found")) {
    return { isRateLimit: false, isDecommissioned: true, message: msg };
  }
  if (status === 429 || msg.includes("rate_limit") || msg.includes("Rate limit")) {
    const retryMatch = msg.match(/try again in (\d+)m(?:(\d+(?:\.\d+)?)s)?/i);
    let retryAfter: number | undefined;
    if (retryMatch) {
      const minutes = parseInt(retryMatch[1]) || 0;
      const seconds = retryMatch[2] ? parseFloat(retryMatch[2]) : 0;
      retryAfter = Math.ceil(minutes * 60 + seconds);
    }
    return { isRateLimit: true, isDecommissioned: false, retryAfter, message: msg };
  }
  return { isRateLimit: false, isDecommissioned: false, message: msg };
}

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: AIOptions = {}
): Promise<string> {
  const fallbackChain = options.fallbackChain || MODELS.CHAT_FALLBACKS;
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 2048;

  let lastError: any = null;
  for (const model of fallbackChain) {
    try {
      const completion = await groq.chat.completions.create({
        messages, model, temperature, max_tokens: maxTokens,
        ...(options.responseFormat === "json_object" && {
          response_format: { type: "json_object" }
        }),
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      lastError = err;
      const parsed = parseError(err);
      console.warn(`Model ${model} failed:`, parsed.isRateLimit ? "RATE_LIMIT" : parsed.isDecommissioned ? "DECOMMISSIONED" : "ERROR");
      // Only retry on rate limit or decommissioned, not on other errors
      if (!parsed.isRateLimit && !parsed.isDecommissioned) {
        throw err;
      }
    }
  }

  const parsed = parseError(lastError);
  const e = new Error(
    parsed.isRateLimit
      ? `Daily AI quota exhausted. ${parsed.retryAfter ? `Resets in ${Math.ceil(parsed.retryAfter / 60)} min.` : "Try tomorrow."}`
      : parsed.message
  ) as AIError;
  e.isRateLimit = parsed.isRateLimit;
  e.retryAfter = parsed.retryAfter;
  throw e;
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<string> {
  return chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], options);
}

export async function generateJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<T> {
  const text = await generateText(systemPrompt, userPrompt, {
    ...options,
    responseFormat: "json_object",
    temperature: options.temperature ?? 0.2,
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}