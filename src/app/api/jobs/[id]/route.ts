import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const EDITABLE = ["status", "review_state", "next_action", "notes", "company", "role"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of EDITABLE) {
    if (body[k] !== undefined) {
      sets.push(`${k}=?`);
      vals.push(body[k]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
  vals.push(Number(id));
  db.prepare(`UPDATE job_applications SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}
