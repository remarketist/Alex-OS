import { NextRequest, NextResponse } from "next/server";
import { parseMessyInput } from "@/lib/parser";

/** Preview parse: messy text → categorized tasks (no persistence). */
export async function POST(req: NextRequest) {
  const { raw } = await req.json();
  if (!raw) return NextResponse.json({ error: "raw required" }, { status: 400 });
  return NextResponse.json({ tasks: parseMessyInput(raw) });
}
