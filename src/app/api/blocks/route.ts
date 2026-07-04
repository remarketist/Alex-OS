import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();
  const date = b.date || todayStr();
  let dp = db.prepare("SELECT id FROM daily_plans WHERE date=?").get(date) as { id: number } | undefined;
  if (!dp) {
    db.prepare("INSERT INTO daily_plans (date) VALUES (?)").run(date);
    dp = db.prepare("SELECT id FROM daily_plans WHERE date=?").get(date) as { id: number };
  }
  const maxSort = (db.prepare("SELECT COALESCE(MAX(sort),0) as m FROM work_blocks WHERE date=?").get(date) as { m: number }).m;
  const r = db
    .prepare(
      `INSERT INTO work_blocks (daily_plan_id, date, name, domain, entity_type, entity_id, start_time, end_time, goal, completion_criteria, reminder_copy, status, sort)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'upcoming',?)`
    )
    .run(
      dp.id, date,
      b.name || "Work block",
      b.domain || "admin",
      b.entity_type ?? null,
      b.entity_id ?? null,
      b.start_time || "09:00",
      b.end_time || "10:00",
      b.goal || "",
      b.completion_criteria || "",
      b.reminder_copy || "",
      maxSort + 1
    );
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
