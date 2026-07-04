import { NextResponse } from "next/server";
import { gmailAuthUrl, gmailEnvConfigured } from "@/lib/gmail";

export async function GET() {
  if (!gmailEnvConfigured()) {
    return NextResponse.json(
      { error: "Gmail OAuth not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI." },
      { status: 400 }
    );
  }
  return NextResponse.redirect(gmailAuthUrl());
}
