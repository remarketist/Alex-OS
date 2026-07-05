import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { q } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.APP_URL || req.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${appUrl}/settings?gmail=error`);
  try {
    const tokens = await exchangeCodeForTokens(code);
    await q("UPDATE gmail_connections SET tokens=?, status='connected' WHERE id=1").run(JSON.stringify(tokens));
    return NextResponse.redirect(`${appUrl}/settings?gmail=connected`);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?gmail=error`);
  }
}
