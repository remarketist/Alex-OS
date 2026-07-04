import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const FIELDS = [
  "wake_time", "sleep_time", "work_capacity_hours", "assistant_tone",
  "score_weights", "telegram_chat_id", "telegram_enabled", "reminder_windows", "block_default_minutes",
];

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      sets.push(`${f}=?`);
      vals.push(body[f]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
  db.prepare(`UPDATE settings SET ${sets.join(", ")} WHERE id=1`).run(...vals);
  return NextResponse.json({ ok: true });
}
