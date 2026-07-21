import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createResume, readResume } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const source = await readResume(id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const copy = await createResume({
    ...source,
    id: nanoid(10),
    name: `${source.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(copy, { status: 201 });
}
