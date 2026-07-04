import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { saveDailyScore } from "@/lib/scoring";
import { timeToMin } from "@/lib/dates";

const EDITABLE = [
  "name", "domain", "start_time", "end_time", "goal", "rules",
  "completion_criteria", "reminder_copy", "status", "actual_minutes", "result", "date",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();
  const block = db.prepare("SELECT * FROM work_blocks WHERE id=?").get(Number(id)) as
    | { id: number; date: string; start_time: string; end_time: string; status: string; actual_minutes: number }
    | undefined;
  if (!block) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Completing a block without explicit minutes → assume planned duration
  if (body.status === "completed" && !body.actual_minutes && !block.actual_minutes) {
    body.actual_minutes = Math.max(timeToMin(block.end_time) - timeToMin(block.start_time), 0);
  }
  // Only one active block at a time
  if (body.status === "active") {
    db.prepare("UPDATE work_blocks SET status='upcoming' WHERE date=? AND status='active'").run(block.date);
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of EDITABLE) {
    if (body[k] !== undefined) {
      sets.push(`${k}=?`);
      vals.push(body[k]);
    }
  }
  if (sets.length) {
    vals.push(Number(id));
    db.prepare(`UPDATE work_blocks SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  }
  saveDailyScore(block.date);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  db.prepare("DELETE FROM work_blocks WHERE id=?").run(Number(id));
  return NextResponse.json({ ok: true });
}
