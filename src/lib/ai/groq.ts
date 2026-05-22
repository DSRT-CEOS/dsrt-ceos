import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Free tier model hierarchy (highest TPD first - use cheapest models when possible)
// Each model has separate daily token quota
export const MODELS = {
  FAST: "llama-3.1-8b-instant",        // 500K TPD - fastest, smallest
  BALANCED: "llama-3.3-70b-versatile", // 100K TPD - good quality
  LARGE: "llama-3.3-70b-versatile",
  // Fallback chain for when primary fails
  CHAT_FALLBACKS: [
    "llama-3.3-70b-versatile",      // try this first
    "llama-3.1-8b-instant",          // fallback - much higher quota
    "llama-3.2-90b-vision-preview",  // another fallback
    "mixtral-8x7b-32768",            // backup
  ],
  EXTRACTION_FALLBACKS: [
    "llama-3.1-8b-instant",          // fast model is fine for extraction
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
  ],
};

export interface AIOptions {
  model?: string;
  fallbackChain?: string[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface AIError {
  isRateLimit: boolean;
  retryAfter?: number; // seconds
  message: string;
  model?: string;
}

function parseRateLimitError(err: any): { isRateLimit: boolean; retryAfter?: number; message: string } {
  const msg = err?.message || String(err);
  if (err?.status === 429 || msg.includes("rate_limit") || msg.includes("Rate limit")) {
    // Try to extract retry time from message
    const retryMatch = msg.match(/try again in (\d+)m(?:(\d+(?:\.\d+)?)s)?/i);
    let retryAfter: number | undefined;
    if (retryMatch) {
      const minutes = parseInt(retryMatch[1]) || 0;
      const seconds = retryMatch[2] ? parseFloat(retryMatch[2]) : 0;
      retryAfter = Math.ceil(minutes * 60 + seconds);
    }
    return { isRateLimit: true, retryAfter, message: msg };
  }
  return { isRateLimit: false, message: msg };
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<string> {
  const fallbackChain = options.fallbackChain || MODELS.CHAT_FALLBACKS;
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 2048;

  let lastError: any = null;

  for (const model of fallbackChain) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model,
        temperature,
        max_tokens: maxTokens,
        ...(options.responseFormat === "json_object" && {
          response_format: { type: "json_object" }
        }),
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      lastError = err;
      const parsed = parseRateLimitError(err);
      console.warn(`Model ${model} failed: ${parsed.isRateLimit ? "RATE_LIMIT" : "ERROR"} - trying next`);
      if (!parsed.isRateLimit) {
        // Non-rate-limit error, break out
        throw err;
      }
      // Continue to next model
    }
  }

  // All models exhausted
  const parsed = parseRateLimitError(lastError);
  const e: AIError = {
    isRateLimit: parsed.isRateLimit,
    retryAfter: parsed.retryAfter,
    message: parsed.isRateLimit
      ? `Daily AI quota exhausted on all models. ${parsed.retryAfter ? `Resets in ${Math.ceil(parsed.retryAfter / 60)} minutes.` : "Try again tomorrow."}`
      : parsed.message,
  };
  throw e;
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

// Helper: complete chat with messages + fallback
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
      const parsed = parseRateLimitError(err);
      console.warn(`Chat model ${model} failed: ${parsed.isRateLimit ? "RATE_LIMIT" : "ERROR"}`);
      if (!parsed.isRateLimit) throw err;
    }
  }

  const parsed = parseRateLimitError(lastError);
  const e: AIError = {
    isRateLimit: parsed.isRateLimit,
    retryAfter: parsed.retryAfter,
    message: parsed.isRateLimit
      ? `Daily AI quota exhausted. ${parsed.retryAfter ? `Resets in ${Math.ceil(parsed.retryAfter / 60)} min.` : "Try tomorrow."}`
      : parsed.message,
  };
  throw e;
}