import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readIndex, createResume } from "@/lib/storage";
import { newResume } from "@/lib/defaults";
import { TemplateIdSchema } from "@/lib/schema";

export async function GET() {
  return NextResponse.json(await readIndex());
}

const CreateBody = z.object({
  name: z.string().min(1),
  templateId: TemplateIdSchema.optional(),
});

export async function POST(req: NextRequest) {
  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const resume = await createResume(
    newResume(parsed.data.name, parsed.data.templateId ?? "modern")
  );
  return NextResponse.json(resume, { status: 201 });
}
