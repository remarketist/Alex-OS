import { q } from "@/lib/db";
import { getTelegramConfig } from "@/lib/telegram";
import { gmailEnvConfigured } from "@/lib/gmail";
import { SettingsClient } from "./SettingsClient";
import type { Settings, Reminder, GmailConnection, TelegramMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = (await q("SELECT * FROM settings WHERE id=1").get<Settings>())!;
  const reminders = await q("SELECT * FROM reminders ORDER BY time").all<Reminder>();
  const gmail = (await q(
    "SELECT id, email, status, last_sync, scan_start, included_keywords, excluded_keywords, ignored_senders, ignored_companies FROM gmail_connections WHERE id=1"
  ).get<GmailConnection>())!;
  const tgConfig = await getTelegramConfig();
  const tgMessages = await q("SELECT * FROM telegram_messages ORDER BY id DESC LIMIT 12").all<TelegramMessage>();

  return (
    <SettingsClient
      settings={settings}
      reminders={reminders}
      gmail={gmail}
      telegramTokenSet={!!tgConfig.token}
      gmailEnvSet={gmailEnvConfigured()}
      tgMessages={tgMessages}
    />
  );
}
