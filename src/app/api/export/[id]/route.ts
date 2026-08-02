import { NextRequest, NextResponse } from "next/server";
import { exportResumePdf } from "@/lib/pdf/exporter";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  try {
    const result = await exportResumePdf(id, origin);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("PDF export resume failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith("Resume not found") ? 404 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
