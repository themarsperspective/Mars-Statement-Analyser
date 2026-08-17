import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { extractFromCsv, extractFromPageTexts } from "@/lib/parseStatement";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name;
  const isPdf = fileName.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  const isCsv = fileName.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  try {
    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: false });
      const data = extractFromPageTexts(text);
      return NextResponse.json({ data, fileName });
    }

    if (isCsv) {
      const text = buffer.toString("utf-8");
      const { data } = extractFromCsv(text);
      return NextResponse.json({ data, fileName });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF or CSV." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Failed to parse statement:", err);
    return NextResponse.json({ error: "Failed to parse file." }, { status: 500 });
  }
}
