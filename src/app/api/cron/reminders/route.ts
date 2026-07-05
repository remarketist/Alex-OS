import { NextRequest, NextResponse } from "next/server";
import { dueReminders, sendTelegramMessage, stateAwareReminder } from "@/lib/telegram";
import { runGmailSync, gmailEnvConfigured } from "@/lib/gmail";
import { q } from "@/lib/db";

/**
 * Scheduled dispatcher. Hit this every 5 minutes with any scheduler:
 *   - cron-job.org (free): GET <APP_URL>/api/cron/reminders?key=<CRON_SECRET>
 *   - Cloudflare Worker cron trigger or system crontab work the same way.
 * Sends due Telegram reminders (state-aware) and runs a Gmail sync once a day.
 * Optional protection: set CRON_SECRET and pass ?key=<secret>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const due = await dueReminders(5);
  const sent: string[] = [];
  for (const r of due) {
    const text = await stateAwareReminder(r.label, r.message);
    await sendTelegramMessage(text, "reminder");
    sent.push(r.label);
  }

  // Daily Gmail sync around 08:00
  let gmailSynced = false;
  const hour = new Date().getHours();
  if (hour === 8 && gmailEnvConfigured()) {
    const already = await q(
      "SELECT COUNT(*) as c FROM gmail_sync_runs WHERE mode='scheduled' AND date(ts)=date('now')"
    ).get<{ c: number }>();
    if (Number(already?.c ?? 0) === 0) {
      await runGmailSync("scheduled");
      gmailSynced = true;
    }
  }

  return NextResponse.json({ ok: true, sent, gmailSynced });
}
