import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/storage";

const TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type Params = { params: Promise<{ file: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { file } = await params;
  // filenames are generated server-side; reject anything path-like
  if (!/^[A-Za-z0-9_-]+\.[a-z]+$/.test(file)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }
  const type = TYPE_BY_EXT[path.extname(file)];
  if (!type) return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  try {
    const bytes = await fs.readFile(path.join(UPLOADS_DIR, file));
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
