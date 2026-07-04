import { getDb } from "@/lib/db";
import { getTelegramConfig } from "@/lib/telegram";
import { gmailEnvConfigured } from "@/lib/gmail";
import { SettingsClient } from "./SettingsClient";
import type { Settings, Reminder, GmailConnection, TelegramMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const db = getDb();
  const settings = db.prepare("SELECT * FROM settings WHERE id=1").get() as Settings;
  const reminders = db.prepare("SELECT * FROM reminders ORDER BY time").all() as Reminder[];
  const gmail = db.prepare("SELECT id, email, status, last_sync, scan_start, included_keywords, excluded_keywords, ignored_senders, ignored_companies FROM gmail_connections WHERE id=1").get() as GmailConnection;
  const tgConfig = getTelegramConfig();
  const tgMessages = db.prepare("SELECT * FROM telegram_messages ORDER BY id DESC LIMIT 12").all() as TelegramMessage[];

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
