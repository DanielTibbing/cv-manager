import { NextRequest, NextResponse } from "next/server";
import {
  exportLetterPdf,
  UnresolvedPlaceholdersError,
} from "@/lib/pdf/exporter";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  try {
    const result = await exportLetterPdf(id, origin);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof UnresolvedPlaceholdersError) {
      return NextResponse.json(
        { error: err.message, missing: err.keys },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Export failed";
    const status = message.startsWith("Letter not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
