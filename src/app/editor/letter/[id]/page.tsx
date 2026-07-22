import { notFound } from "next/navigation";
import { readIndex, readLetter, readResume } from "@/lib/storage";
import { LetterEditorShell } from "@/components/letter/LetterEditorShell";

export const dynamic = "force-dynamic";

export default async function LetterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const letter = await readLetter(id);
  if (!letter) notFound();
  const [resume, index] = await Promise.all([
    letter.resumeId ? readResume(letter.resumeId) : Promise.resolve(null),
    readIndex(),
  ]);
  return (
    <LetterEditorShell
      initial={letter}
      initialResume={resume}
      resumes={index.resumes.map((r) => ({ id: r.id, name: r.name }))}
    />
  );
}
