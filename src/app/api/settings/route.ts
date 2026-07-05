import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import type { InValue } from "@libsql/client";

const FIELDS = [
  "wake_time", "sleep_time", "work_capacity_hours", "assistant_tone",
  "score_weights", "telegram_chat_id", "telegram_enabled", "reminder_windows", "block_default_minutes",
];

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const sets: string[] = [];
  const vals: InValue[] = [];
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      sets.push(`${f}=?`);
      vals.push(body[f]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
  await q(`UPDATE settings SET ${sets.join(", ")} WHERE id=1`).run(...vals);
  return NextResponse.json({ ok: true });
}
