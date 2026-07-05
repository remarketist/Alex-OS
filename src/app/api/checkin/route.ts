import { NextRequest, NextResponse } from "next/server";
import { logCheckIn } from "@/lib/services";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, value = 1, note = "", date } = body;
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
  const score = await logCheckIn(type, Number(value), note, "app", date);
  return NextResponse.json({ ok: true, score });
}
