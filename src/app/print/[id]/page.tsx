import { notFound } from "next/navigation";
import { readResume } from "@/lib/storage";
import { ResumeDocument } from "@/components/resume/ResumeDocument";

export const dynamic = "force-dynamic";

// Print-only render, no app chrome. This is the page Puppeteer captures;
// it reads persisted data server-side so exports never depend on live
// editor state. The client-side paginator sets data-pagination-ready="true"
// when the discrete pages are laid out — the exporter waits for it.
export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resume = await readResume(id);
  if (!resume) notFound();

  return <ResumeDocument resume={resume} chrome="print" />;
}
