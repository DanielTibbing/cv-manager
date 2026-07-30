import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BackupValidationError,
  analyzeBackup,
  applyBackup,
  type Resolution,
} from "@/lib/backup";

// Merge-import of a backup zip. Two stateless phases (the client re-uploads
// the same small file): "analyze" classifies items as add/skip/conflict,
// "apply" performs the merge with the user's per-conflict resolutions.
const ResolutionsSchema = z.record(z.string(), z.enum(["existing", "imported", "both"]));

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  const mode = form.get("mode");
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    if (mode === "analyze") {
      return NextResponse.json(await analyzeBackup(bytes));
    }
    if (mode === "apply") {
      const raw = form.get("resolutions");
      const parsed = ResolutionsSchema.safeParse(
        typeof raw === "string" && raw ? JSON.parse(raw) : {}
      );
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid resolutions" }, { status: 400 });
      }
      const resolutions: Record<string, Resolution> = parsed.data;
      return NextResponse.json(await applyBackup(bytes, resolutions));
    }
    return NextResponse.json(
      { error: "Missing or invalid 'mode' (analyze|apply)" },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof BackupValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid resolutions JSON" }, { status: 400 });
    }
    throw err;
  }
}
