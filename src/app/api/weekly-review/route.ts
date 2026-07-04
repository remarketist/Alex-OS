import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReview } from "@/lib/services";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const review = generateWeeklyReview(body.weekStart);
  return NextResponse.json({ review });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const b = await req.json();
  if (!b.week_start) return NextResponse.json({ error: "week_start required" }, { status: 400 });
  const fields = ["double_down", "kill", "next_week", "derail_trigger"] as const;
  for (const f of fields) {
    if (b[f] !== undefined) {
      db.prepare(`UPDATE weekly_reviews SET ${f}=? WHERE week_start=?`).run(b[f], b.week_start);
    }
  }
  return NextResponse.json({ ok: true });
}
