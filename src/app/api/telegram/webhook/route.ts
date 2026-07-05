import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { handleCommand, sendTelegramMessage } from "@/lib/telegram";

/**
 * Telegram webhook receiver.
 * Point your bot here: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook
 * Optional shared-secret check via TELEGRAM_WEBHOOK_SECRET
 * (set secret_token when calling setWebhook).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await req.json().catch(() => null);
  const text: string | undefined = update?.message?.text;
  if (!text) return NextResponse.json({ ok: true });

  await q("INSERT INTO telegram_messages (direction, text, command, status) VALUES ('in', ?, ?, 'processed')").run(
    text,
    text.split(/\s+/)[0].toLowerCase()
  );

  const result = await handleCommand(text);
  await sendTelegramMessage(result.reply, "reply");
  return NextResponse.json({ ok: true });
}
