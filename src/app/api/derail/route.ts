import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * POST { trigger?, reset_choice?, related? } → create derail event
 * POST { id, outcome } → close out an event
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();
  if (b.id) {
    db.prepare("UPDATE derail_events SET outcome=? WHERE id=?").run(b.outcome || "", b.id);
    return NextResponse.json({ ok: true });
  }
  const r = db
    .prepare("INSERT INTO derail_events (trigger, reset_choice, related) VALUES (?,?,?)")
    .run(b.trigger || "", b.reset_choice || "", b.related || "");
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
