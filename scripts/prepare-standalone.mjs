// Post-`next build` step for the Electron bundle. The standalone server does
// not copy public/ or .next/static itself (Next expects a CDN), and the
// Puppeteer Chromium must be staged so electron-builder can ship it in the
// app's resources. macOS-only for now.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

async function copy(src, dest) {
  await fs.cp(src, dest, { recursive: true });
}

// 1. Static assets the standalone server expects next to itself.
await copy(path.join(root, "public"), path.join(standalone, "public"));
await copy(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static")
);

// 2. Stage the standalone server for electron-builder. electron-builder
// silently strips any top-level "node_modules" directory from extraResources,
// so the staged copy renames it to "vendor"; electron/main.cjs sets NODE_PATH
// to that directory when forking the server.
const staging = path.join(root, "build", "app-server");
await fs.rm(staging, { recursive: true, force: true });
await copy(standalone, staging);
await fs.rename(
  path.join(staging, "node_modules"),
  path.join(staging, "vendor")
);

// 3. Stage the Puppeteer-downloaded Chrome for Testing into build/chrome/.
//    electron/main.cjs points PUPPETEER_EXECUTABLE_PATH at the bundled copy.
//    The cache layout is arch-specific (mac_arm-*/chrome-mac-arm64 on Apple
//    Silicon, mac-*/chrome-mac-x64 on Intel).
const isArm = process.arch === "arm64";
const cacheRoot = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
let candidates = [];
try {
  candidates = (await fs.readdir(cacheRoot))
    .filter((d) =>
      isArm ? d.startsWith("mac_arm-") : d.startsWith("mac-") && !d.startsWith("mac_arm-")
    )
    .sort();
} catch {
  // cache dir missing entirely
}
const chrome = candidates.at(-1);
if (!chrome) {
  console.error(
    `No Puppeteer Chrome (${process.arch}) found in ~/.cache/puppeteer/chrome.\n` +
      "Run: npx puppeteer browsers install chrome"
  );
  process.exit(1);
}
const appBundle = path.join(
  cacheRoot,
  chrome,
  isArm ? "chrome-mac-arm64" : "chrome-mac-x64",
  "Google Chrome for Testing.app"
);
const chromeDest = path.join(root, "build", "chrome");
// Start clean: re-copying over a previous stage trips on the .app's internal
// framework symlinks.
await fs.rm(chromeDest, { recursive: true, force: true });
await copy(appBundle, path.join(chromeDest, "Google Chrome for Testing.app"));

console.log(`Standalone server prepared; staged Chrome from ${chrome}`);
