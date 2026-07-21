import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import { EXPORTS_DIR } from "@/lib/storage";

// Local-only convenience: reveal an exported PDF in Finder. Restricted to
// files inside exports/ and macOS (`open -R`).
export async function POST(req: NextRequest) {
  const parsed = z.object({ path: z.string() }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const resolved = path.resolve(parsed.data.path);
  if (!resolved.startsWith(EXPORTS_DIR + path.sep)) {
    return NextResponse.json(
      { error: "Only files inside exports/ can be revealed" },
      { status: 400 }
    );
  }
  if (process.platform !== "darwin") {
    return NextResponse.json(
      { error: "Reveal in Finder is only available on macOS" },
      { status: 400 }
    );
  }
  execFile("open", ["-R", resolved]);
  return NextResponse.json({ ok: true });
}
