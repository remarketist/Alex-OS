import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import type { InValue } from "@libsql/client";

const EDITABLE = ["status", "review_state", "next_action", "notes", "company", "role"];

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
  await q(`UPDATE job_applications SET ${sets.join(", ")} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}
