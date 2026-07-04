import { NextRequest, NextResponse } from "next/server";
import { runGmailSync } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "demo" ? "demo" : "manual";
  try {
    const result = await runGmailSync(mode);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
