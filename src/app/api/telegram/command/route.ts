import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { handleCommand } from "@/lib/telegram";

/** Simulate a Telegram command from the web UI (same parser as the webhook — voice-ready). */
export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const db = getDb();
  db.prepare("INSERT INTO telegram_messages (direction, text, command, status) VALUES ('in', ?, ?, 'simulated')").run(
    text,
    text.split(/\s+/)[0].toLowerCase()
  );
  const result = handleCommand(text);
  db.prepare("INSERT INTO telegram_messages (direction, text, command, status) VALUES ('out', ?, 'reply', 'simulated')").run(result.reply);
  return NextResponse.json(result);
}
