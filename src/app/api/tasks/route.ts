import { NextRequest, NextResponse } from "next/server";
import { parseMessyInput } from "@/lib/parser";
import { createTaskFromAssistant } from "@/lib/services";

/**
 * POST { raw: "messy text" }  → parse + create tasks (voice-ready capture pipeline)
 * POST { title, domain, ... } → create one structured task
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.raw) {
    const parsed = parseMessyInput(body.raw);
    const ids = parsed.map((t) =>
      createTaskFromAssistant({
        title: t.title,
        domain: t.domain,
        entity_type: t.entity_type,
        entity_id: t.entity_id,
        entity_name: t.entity_name,
        priority: t.priority,
        effort_min: t.effort_min,
        recurring: t.recurring,
        status: "inbox",
      })
    );
    return NextResponse.json({ ok: true, created: ids.length, tasks: parsed });
  }

  if (!body.title) return NextResponse.json({ error: "title or raw required" }, { status: 400 });
  const id = createTaskFromAssistant(body);
  return NextResponse.json({ ok: true, id });
}
