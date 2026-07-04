import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const FIELDS = ["scan_start", "included_keywords", "excluded_keywords", "ignored_senders", "ignored_companies"];

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
  db.prepare(`UPDATE gmail_connections SET ${sets.join(", ")} WHERE id=1`).run(...vals);
  return NextResponse.json({ ok: true });
}
