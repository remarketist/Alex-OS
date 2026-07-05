import { NextRequest, NextResponse } from "next/server";
import { getTodayContext, getWeeklySprintContext, getKnowledgeBaseContext } from "@/lib/services";
import { q } from "@/lib/db";

/**
 * Hermes-ready read API.
 * GET /api/context/today  → today's plan, blocks, stats, score
 * GET /api/context/week   → sprint + weekly targets vs actuals
 * GET /api/context/kb     → clients, projects, fitness, rules, aliases
 * GET /api/context/derail → recent derail events
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string }> }
) {
  const { scope } = await params;
  const date = req.nextUrl.searchParams.get("date") || undefined;
  switch (scope) {
    case "today":
      return NextResponse.json(await getTodayContext(date));
    case "week":
      return NextResponse.json(await getWeeklySprintContext(date));
    case "kb":
      return NextResponse.json(await getKnowledgeBaseContext());
    case "derail":
      return NextResponse.json({
        events: await q("SELECT * FROM derail_events ORDER BY ts DESC LIMIT 20").all(),
      });
    default:
      return NextResponse.json({ error: "unknown scope" }, { status: 400 });
  }
}
