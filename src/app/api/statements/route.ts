import { NextRequest, NextResponse } from "next/server";
import { listStatements, saveStatement } from "@/lib/storage";
import { ExtractedData } from "@/lib/types";
import { isSaveAvailable, SAVE_UNAVAILABLE_MESSAGE } from "@/lib/deployment";

export const runtime = "nodejs";

export async function GET() {
  const statements = await listStatements();
  return NextResponse.json({ statements });
}

export async function POST(req: NextRequest) {
  if (!isSaveAvailable()) {
    return NextResponse.json({ error: SAVE_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  const body = await req.json();
  const data = body.data as ExtractedData;
  const sourceFileName = (body.sourceFileName as string) || "unknown";

  if (!data) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const record = await saveStatement(data, sourceFileName);
  return NextResponse.json({ record });
}
