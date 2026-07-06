import { NextRequest, NextResponse } from "next/server";
import { dueReminders, sendTelegramMessage, stateAwareReminder, processBlockTicks } from "@/lib/telegram";
import { runGmailSync, gmailEnvConfigured } from "@/lib/gmail";
import { q } from "@/lib/db";
import { nowHour } from "@/lib/dates";

/**
 * The heartbeat. Fired every 5 minutes by the Cloudflare cron trigger
 * (see custom-worker.js + wrangler.jsonc); any external scheduler hitting
 * this URL works too. Each tick:
 *   1. auto-advances today's blocks (start → live + Telegram ping,
 *      end → completion check-in, stale → missed)
 *   2. sends any due standalone reminders (state-aware copy)
 *   3. once a day (~08:00 app time) runs the Gmail job scan
 * Optional protection: set CRON_SECRET and pass ?key=<secret>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  console.log("[route] GET /api/cron/reminders — tick");

  // 1. Block lifecycle: activate, announce, request reports
  const blockActions = await processBlockTicks(5);

  // 2. Standalone scheduled reminders
  const due = await dueReminders(5);
  const sent: string[] = [];
  for (const r of due) {
    const text = await stateAwareReminder(r.label, r.message);
    await sendTelegramMessage(text, "reminder");
    sent.push(r.label);
  }

  // 3. Daily Gmail sync around 08:00 app time
  let gmailSynced = false;
  if (nowHour() === 8 && gmailEnvConfigured()) {
    const already = await q(
      "SELECT COUNT(*) as c FROM gmail_sync_runs WHERE mode='scheduled' AND date(ts)=date('now')"
    ).get<{ c: number }>();
    if (Number(already?.c ?? 0) === 0) {
      await runGmailSync("scheduled");
      gmailSynced = true;
    }
  }

  return NextResponse.json({ ok: true, blockActions, sent, gmailSynced });
}
