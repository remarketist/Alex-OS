import { NextResponse } from "next/server";
import { sendTelegramMessage, getTelegramConfig } from "@/lib/telegram";

export async function POST() {
  const config = await getTelegramConfig();
  const result = await sendTelegramMessage(
    "Alex OS online. This is a test message. Reply 'today' to see your mission.",
    "test"
  );
  return NextResponse.json({ ...result, configured: config.configured });
}
