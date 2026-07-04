import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const EDITABLE = [
  "title", "notes", "domain", "entity_type", "entity_id", "entity_name",
  "priority", "effort_min", "due_date", "status", "scheduled_date", "recurring",
];

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
  db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  db.prepare("DELETE FROM tasks WHERE id=?").run(Number(id));
  return NextResponse.json({ ok: true });
}
