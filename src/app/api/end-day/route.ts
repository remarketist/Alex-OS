import { NextRequest, NextResponse } from "next/server";
import { generateDailySummary } from "@/lib/services";
import { todayStr } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const summary = await generateDailySummary(body.date || todayStr());
  return NextResponse.json(summary);
}
