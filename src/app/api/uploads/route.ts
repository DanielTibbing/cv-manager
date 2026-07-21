import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { UPLOADS_DIR } from "@/lib/storage";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported type ${file.type}; use JPEG, PNG or WebP` },
      { status: 400 }
    );
  }
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${nanoid(10)}.${ext}`;
  await fs.writeFile(
    path.join(UPLOADS_DIR, name),
    Buffer.from(await file.arrayBuffer())
  );
  return NextResponse.json({ file: name }, { status: 201 });
}
