import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { saveDailyScore } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const b = await req.json();
  const date = b.date || todayStr();
  await q(
    `INSERT INTO journal_entries (date, moved, avoided, trigger, proud, tomorrow_first_block, one_truth)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(date) DO UPDATE SET moved=excluded.moved, avoided=excluded.avoided, trigger=excluded.trigger,
       proud=excluded.proud, tomorrow_first_block=excluded.tomorrow_first_block, one_truth=excluded.one_truth`
  ).run(date, b.moved || "", b.avoided || "", b.trigger || "", b.proud || "", b.tomorrow_first_block || "", b.one_truth || "");
  const score = await saveDailyScore(date);
  return NextResponse.json({ ok: true, score });
}
