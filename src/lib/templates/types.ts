import type { Layout, TemplateId, ThemeTokens } from "@/lib/schema";

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  tokens: ThemeTokens;
  defaultLayout: Pick<
    Layout,
    "mode" | "sidePosition" | "headerPlacement" | "sideColumnWidthPercent"
  >;
  // Section kinds that this template slots into the side column
  // (only relevant when mode === "two-column").
  sideKinds: string[];
}
