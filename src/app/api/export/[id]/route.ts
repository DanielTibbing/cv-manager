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
    const message = err instanceof Error ? err.message : "Export failed";
    const status = message.startsWith("Resume not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
