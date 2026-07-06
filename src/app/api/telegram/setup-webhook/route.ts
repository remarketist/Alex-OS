import { NextRequest, NextResponse } from "next/server";

/**
 * One-click "enable replies": registers this app as the bot's webhook so
 * inbound Telegram messages (DONE, jobs 3, smoked 2, …) hit /api/telegram/webhook.
 * Uses TELEGRAM_BOT_TOKEN from env and APP_URL (falls back to the request origin).
 */
export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set in the Worker" }, { status: 400 });
  }
  const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
  const webhookUrl = `${base}/api/telegram/webhook`;
  const body: Record<string, string> = { url: webhookUrl };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as { ok: boolean; description?: string };
    if (!j.ok) return NextResponse.json({ ok: false, error: j.description || "Telegram rejected the webhook" }, { status: 400 });
    return NextResponse.json({ ok: true, webhook: webhookUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
