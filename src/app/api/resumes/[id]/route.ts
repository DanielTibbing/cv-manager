import { NextRequest, NextResponse } from "next/server";
import { ResumeSchema } from "@/lib/schema";
import { deleteResume, readResume, writeResume } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const resume = await readResume(id);
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resume);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = ResumeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.id !== id) {
    return NextResponse.json({ error: "Body id does not match URL" }, { status: 400 });
  }
  const existing = await readResume(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await writeResume(parsed.data));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteResume(id);
  return NextResponse.json({ ok: true });
}
