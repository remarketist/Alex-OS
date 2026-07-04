import { getDb } from "@/lib/db";
import { todayStr, formatDate } from "@/lib/dates";
import { JournalClient } from "./JournalClient";
import type { JournalEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function JournalPage() {
  const db = getDb();
  const today = todayStr();
  const entry = db.prepare("SELECT * FROM journal_entries WHERE date=?").get(today) as JournalEntry | undefined;
  const past = db
    .prepare("SELECT * FROM journal_entries WHERE date < ? ORDER BY date DESC LIMIT 14")
    .all(today) as JournalEntry[];

  return (
    <JournalClient
      today={today}
      entry={entry ?? null}
      past={past.map((p) => ({ ...p, label: formatDate(p.date) }))}
    />
  );
}
