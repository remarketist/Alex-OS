import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { getDayStats } from "@/lib/scoring";
import { EndDayClient } from "./EndDayClient";
import type { JournalEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function EndDayPage() {
  const db = getDb();
  const today = todayStr();
  const stats = getDayStats(today);
  const entry = db.prepare("SELECT * FROM journal_entries WHERE date=?").get(today) as JournalEntry | undefined;

  return (
    <EndDayClient
      today={today}
      entry={entry ?? null}
      stats={{
        jobs: stats.jobs,
        clientMinutes: stats.clientMinutes,
        projectMinutes: stats.projectMinutes,
        walk: stats.walk,
        workout: stats.workout,
        meditation: stats.meditation,
        smokeCount: stats.smokeCount,
        smokeTarget: stats.smokeTarget,
        blocksCompleted: stats.blocksCompleted,
        blocksTotal: stats.blocksTotal,
        mood: stats.mood,
        energy: stats.energy,
      }}
    />
  );
}
