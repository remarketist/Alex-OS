import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { todayStr } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const b = await req.json();
  const date = b.date || todayStr();
  let dp = await q("SELECT id FROM daily_plans WHERE date=?").get<{ id: number }>(date);
  if (!dp) {
    await q("INSERT INTO daily_plans (date) VALUES (?)").run(date);
    dp = await q("SELECT id FROM daily_plans WHERE date=?").get<{ id: number }>(date);
  }
  const maxSort = await q("SELECT COALESCE(MAX(sort),0) as m FROM work_blocks WHERE date=?").get<{ m: number }>(date);
  const r = await q(
    `INSERT INTO work_blocks (daily_plan_id, date, name, domain, entity_type, entity_id, start_time, end_time, goal, completion_criteria, reminder_copy, status, sort)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'upcoming',?)`
  ).run(
    dp?.id ?? null, date,
    b.name || "Work block",
    b.domain || "admin",
    b.entity_type ?? null,
    b.entity_id ?? null,
    b.start_time || "09:00",
    b.end_time || "10:00",
    b.goal || "",
    b.completion_criteria || "",
    b.reminder_copy || "",
    Number(maxSort?.m ?? 0) + 1
  );
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}
