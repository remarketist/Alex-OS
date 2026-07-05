import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import type { InValue } from "@libsql/client";

const EDITABLE = [
  "title", "notes", "domain", "entity_type", "entity_id", "entity_name",
  "priority", "effort_min", "due_date", "status", "scheduled_date", "recurring",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const sets: string[] = [];
  const vals: InValue[] = [];
  for (const k of EDITABLE) {
    if (body[k] !== undefined) {
      sets.push(`${k}=?`);
      vals.push(body[k]);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
  vals.push(Number(id));
  await q(`UPDATE tasks SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await q("DELETE FROM tasks WHERE id=?").run(Number(id));
  return NextResponse.json({ ok: true });
}
