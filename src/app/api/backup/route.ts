import { NextResponse } from "next/server";
import { createBackupZip } from "@/lib/backup";

// Full data export (resumes, letters, uploads, index) as a zip download —
// the user's cross-machine backup, e.g. dropped into Google Drive.
export async function GET() {
  const zip = await createBackupZip();
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cv-manager-backup-${date}.zip"`,
    },
  });
}
