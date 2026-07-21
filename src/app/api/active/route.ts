import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readIndex, setActiveResume } from "@/lib/storage";

export async function GET() {
  const index = await readIndex();
  return NextResponse.json({ activeResumeId: index.activeResumeId });
}

const Body = z.object({ id: z.string().min(1) });

export async function PUT(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  try {
    const index = await setActiveResume(parsed.data.id);
    return NextResponse.json({ activeResumeId: index.activeResumeId });
  } catch {
    return NextResponse.json({ error: "Unknown resume id" }, { status: 404 });
  }
}
