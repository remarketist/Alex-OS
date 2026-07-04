import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyPlan, activatePlan, type ProposedPlan } from "@/lib/sprint-builder";
import { getDb } from "@/lib/db";
import { weekStart, todayStr } from "@/lib/dates";

/**
 * POST { action: "generate", messy, weekStart? } → proposed plan
 * POST { action: "activate", plan, messy }       → persist + activate
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    const ws = body.weekStart || weekStart(todayStr());
    const plan = generateWeeklyPlan(body.messy || "", ws);
    return NextResponse.json({ plan });
  }

  if (body.action === "activate") {
    const db = getDb();
    const sprint = db.prepare("SELECT id FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get() as { id: number } | undefined;
    const id = activatePlan(body.plan as ProposedPlan, body.messy || "", sprint?.id ?? null);
    return NextResponse.json({ ok: true, weeklyPlanId: id });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
