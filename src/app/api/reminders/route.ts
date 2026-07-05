import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import type { InValue } from "@libsql/client";

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (b.id) {
    const fields = ["time", "label", "message", "enabled", "days"];
    const sets: string[] = [];
    const vals: InValue[] = [];
    for (const f of fields) {
      if (b[f] !== undefined) {
        sets.push(`${f}=?`);
        vals.push(b[f]);
      }
    }
    if (sets.length) {
      vals.push(b.id);
      await q(`UPDATE reminders SET ${sets.join(", ")} WHERE id=?`).run(...vals);
    }
    return NextResponse.json({ ok: true });
  }
  const r = await q("INSERT INTO reminders (time, label, message, enabled, days) VALUES (?,?,?,?,?)").run(
    b.time || "09:00", b.label || "", b.message || "", b.enabled ?? 1, b.days || "[1,2,3,4,5]"
  );
  return NextResponse.json({ ok: true, id: r.lastInsertRowid });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await q("DELETE FROM reminders WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
