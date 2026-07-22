import { NextRequest, NextResponse } from "next/server";
import { LetterSchema } from "@/lib/schema";
import {
  ConflictError,
  deleteLetter,
  readLetter,
  writeLetter,
} from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const letter = await readLetter(id);
  if (!letter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(letter);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = LetterSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.id !== id) {
    return NextResponse.json({ error: "Body id does not match URL" }, { status: 400 });
  }
  const existing = await readLetter(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const saved = await writeLetter(parsed.data, {
      baseUpdatedAt: req.headers.get("x-base-updated-at") ?? undefined,
    });
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: "conflict", serverUpdatedAt: err.serverUpdatedAt },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteLetter(id);
  return NextResponse.json({ ok: true });
}
