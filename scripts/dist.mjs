// Runs electron-builder with code-signing disabled, cross-platform (the
// Unix-style `VAR=value command` syntax doesn't work in Windows cmd, so the
// env var is set programmatically here).
// --publish never: electron-builder auto-publishes on CI (and demands a
// GH_TOKEN); release publishing is handled by the workflow's release job.
import { spawn } from "node:child_process";

const builder = spawn(
  "npx",
  ["electron-builder", "--publish", "never", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
  }
);

builder.on("exit", (code) => process.exit(code ?? 1));
