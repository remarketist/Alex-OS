import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const FIELDS = [
  "name", "main_outcome", "king_metric", "secondary_metrics", "constraints",
  "start_date", "end_date", "wake_time", "sleep_time", "work_capacity_hours",
  "assistant_tone", "smoking_plan", "body_goals", "goals", "status",
];

/** PATCH { id, ...fields } updates a sprint. POST creates a new one (deactivating the old). */
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      sets.push(`${f}=?`);
      vals.push(body[f]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
  vals.push(body.id);
  db.prepare(`UPDATE sprints SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();
  if (!b.name || !b.start_date || !b.end_date) {
    return NextResponse.json({ error: "name, start_date, end_date required" }, { status: 400 });
  }
  db.prepare("UPDATE sprints SET status='completed' WHERE status='active'").run();
  const r = db
    .prepare(
      `INSERT INTO sprints (name, main_outcome, king_metric, secondary_metrics, constraints, start_date, end_date, wake_time, sleep_time, work_capacity_hours, assistant_tone, smoking_plan, body_goals, goals, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`
    )
    .run(
      b.name, b.main_outcome || "", b.king_metric || "", b.secondary_metrics || "[]",
      b.constraints || "", b.start_date, b.end_date, b.wake_time || "07:30",
      b.sleep_time || "23:30", b.work_capacity_hours || 8, b.assistant_tone || "firm-tactical",
      b.smoking_plan || "", b.body_goals || "", b.goals || "[]"
    );
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
