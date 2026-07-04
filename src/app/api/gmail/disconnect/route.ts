import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  const db = getDb();
  db.prepare("UPDATE gmail_connections SET tokens='', status='disconnected', email='' WHERE id=1").run();
  return NextResponse.json({ ok: true });
}
