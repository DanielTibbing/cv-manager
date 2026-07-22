import { notFound } from "next/navigation";
import { readLetter, readResume } from "@/lib/storage";
import { LetterDocument } from "@/components/letter/LetterDocument";

export const dynamic = "force-dynamic";

// Print-only letter render, captured by Puppeteer. Lives under
// print/layout.tsx so print.css (@page A4, break-after) applies unchanged.
export default async function PrintLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const letter = await readLetter(id);
  if (!letter) notFound();
  const resume = letter.resumeId ? await readResume(letter.resumeId) : null;

  return <LetterDocument letter={letter} resume={resume} chrome="print" />;
}
