import { NextResponse } from "next/server";
import { isSupportWidgetEnabled } from "@/lib/support/widget-status";

export async function GET() {
  const enabled = await isSupportWidgetEnabled();
  return NextResponse.json({ enabled });
}
