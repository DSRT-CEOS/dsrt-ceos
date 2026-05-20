import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const MODELS = {
  FAST: "llama-3.1-8b-instant",
  BALANCED: "llama-3.3-70b-versatile",
  LARGE: "llama-3.3-70b-versatile",
};

export interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<string> {
  const {
    model = MODELS.BALANCED,
    temperature = 0.3,
    maxTokens = 4096,
    responseFormat = "text",
  } = options;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model,
    temperature,
    max_tokens: maxTokens,
    ...(responseFormat === "json_object" && {
      response_format: { type: "json_object" },
    }),
  });

  return completion.choices[0]?.message?.content || "";
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
  } catch (e) {
    console.error("JSON parse error:", text);
    throw new Error("AI returned invalid JSON");
  }
}