import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export async function POST() {
  await q("UPDATE gmail_connections SET tokens='', status='disconnected', email='' WHERE id=1").run();
  return NextResponse.json({ ok: true });
}
