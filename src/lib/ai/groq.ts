import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export const MODELS = {
  FAST: "llama-3.1-8b-instant",
  BALANCED: "llama-3.3-70b-versatile",
};

export async function generateJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  model = MODELS.FAST
): Promise<T> {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0]?.message?.content || "{}") as T;
}