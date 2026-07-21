import { notFound } from "next/navigation";
import { readResume } from "@/lib/storage";
import { EditorShell } from "@/components/editor/EditorShell";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resume = await readResume(id);
  if (!resume) notFound();
  return <EditorShell initial={resume} />;
}
