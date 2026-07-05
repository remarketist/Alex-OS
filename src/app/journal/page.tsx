import { q } from "@/lib/db";
import { todayStr, formatDate } from "@/lib/dates";
import { JournalClient } from "./JournalClient";
import type { JournalEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const today = todayStr();
  const entry = await q("SELECT * FROM journal_entries WHERE date=?").get<JournalEntry>(today);
  const past = await q("SELECT * FROM journal_entries WHERE date < ? ORDER BY date DESC LIMIT 14").all<JournalEntry>(today);

  return (
    <JournalClient
      today={today}
      entry={entry ?? null}
      past={past.map((p) => ({ ...p, label: formatDate(p.date) }))}
    />
  );
}
