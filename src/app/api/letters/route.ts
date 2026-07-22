import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createLetter, readIndex, readLetter } from "@/lib/storage";
import { newLetter } from "@/lib/defaults";

export async function GET() {
  const index = await readIndex();
  return NextResponse.json({ letters: index.letters });
}

const CreateBody = z.object({
  name: z.string().optional(),
  resumeId: z.string().nullable().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  jobDescription: z.string().optional(),
  jobUrl: z.string().optional(),
  // Copy content (heading/body/recipient/date/headerStyle/resumeId) from an
  // existing letter — the "new letter for application" flow.
  baseLetterId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  let letter = newLetter(input);
  if (input.baseLetterId) {
    const base = await readLetter(input.baseLetterId);
    if (!base) {
      return NextResponse.json({ error: "Base letter not found" }, { status: 404 });
    }
    letter = {
      ...letter,
      id: nanoid(10),
      resumeId: input.resumeId !== undefined ? input.resumeId : base.resumeId,
      headerStyle: base.headerStyle,
      heading: base.heading,
      body: base.body,
      recipient: base.recipient,
      date: base.date,
    };
  }

  return NextResponse.json(await createLetter(letter), { status: 201 });
}
