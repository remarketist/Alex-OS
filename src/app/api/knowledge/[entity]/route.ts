import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Knowledge Base CRUD.
 * Entities: clients | projects | rules | aliases | fitness
 * POST with { id } updates; without creates. DELETE with { id } removes.
 */

const TABLES: Record<string, { table: string; fields: string[] }> = {
  clients: {
    table: "clients",
    fields: ["name", "aliases", "type", "description", "priority", "active", "weekly_target_hours", "recurring_deliverables", "brand_voice", "notes", "links"],
  },
  projects: {
    table: "projects",
    fields: ["name", "aliases", "description", "category", "priority", "status", "outcome_60d", "weekly_block_target", "milestone", "next_actions", "notes"],
  },
  rules: {
    table: "assistant_rules",
    fields: ["name", "description", "domain", "priority"],
  },
  aliases: {
    table: "entity_aliases",
    fields: ["alias", "entity_type", "entity_id"],
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const db = getDb();
  const { entity } = await params;
  const body = await req.json();

  if (entity === "fitness") {
    const fields = ["goal", "workout_type", "constraints", "preferred_habits", "weekly_targets", "smoking_goal", "smoking_daily_target", "no_smoke_before", "walking_target", "meditation_target"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f}=?`);
        vals.push(body[f]);
      }
    }
    if (sets.length) db.prepare(`UPDATE fitness_profiles SET ${sets.join(", ")} WHERE id=1`).run(...vals);
    return NextResponse.json({ ok: true });
  }

  const spec = TABLES[entity];
  if (!spec) return NextResponse.json({ error: "unknown entity" }, { status: 400 });

  if (body.id) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of spec.fields) {
      if (body[f] !== undefined) {
        sets.push(`${f}=?`);
        vals.push(body[f]);
      }
    }
    if (!sets.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
    vals.push(body.id);
    db.prepare(`UPDATE ${spec.table} SET ${sets.join(", ")} WHERE id=?`).run(...vals);
    return NextResponse.json({ ok: true, id: body.id });
  }

  const present = spec.fields.filter((f) => body[f] !== undefined);
  if (!present.length) return NextResponse.json({ error: "no fields" }, { status: 400 });
  const r = db
    .prepare(`INSERT INTO ${spec.table} (${present.join(",")}) VALUES (${present.map(() => "?").join(",")})`)
    .run(...present.map((f) => body[f]));
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const db = getDb();
  const { entity } = await params;
  const { id } = await req.json();
  const spec = TABLES[entity];
  if (!spec || !id) return NextResponse.json({ error: "bad request" }, { status: 400 });
  db.prepare(`DELETE FROM ${spec.table} WHERE id=?`).run(id);
  return NextResponse.json({ ok: true });
}
