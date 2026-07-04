/**
 * AI provider abstraction.
 * If ANTHROPIC_API_KEY is set, planning/summaries can be AI-generated.
 * Without a key, every consumer falls back to deterministic logic — the app
 * is fully functional with zero AI configuration.
 */

export function aiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function aiComplete(system: string, user: string, maxTokens = 1024): Promise<string | null> {
  if (!aiAvailable()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content: { type: string; text?: string }[] };
    return j.content.find((c) => c.type === "text")?.text ?? null;
  } catch {
    return null;
  }
}

export const ASSISTANT_SYSTEM_PROMPT = `You are the Alex OS execution assistant. Tone: firm, sharp, tactical, emotionally intelligent, direct, non-cringey. Never use hype language or motivational clichés. Short sentences. Concrete numbers. One clear next action. When the user is drifting, give one small action, not a lecture. When a day is going badly, shrink the target instead of letting the day collapse.`;
