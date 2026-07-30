// Shared import/export types — safe to import from client components
// (src/lib/backup.ts, the implementation, is server-only).

export type ImportPlanItem = {
  kind: "resume" | "letter";
  importedId: string;
  name: string;
};

export type ImportConflict = ImportPlanItem & {
  localId: string;
  existingUpdatedAt: string;
  importedUpdatedAt: string;
};

export type ImportPlan = {
  add: ImportPlanItem[];
  skip: ImportPlanItem[];
  conflicts: ImportConflict[];
  uploads: { add: number; skip: number };
};

export type Resolution = "existing" | "imported" | "both";

export type ImportSummary = {
  added: number;
  skipped: number;
  replaced: number;
  keptBoth: number;
  uploadsAdded: number;
};
