// Post-`next build` step for the Electron bundle. The standalone server does
// not copy public/ or .next/static itself (Next expects a CDN), and the
// Puppeteer Chromium must be staged so electron-builder can ship it in the
// app's resources. Cross-platform: mac (arm64/x64), Windows, Linux.
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

// Next.js NFT omits Turbopack app-route runtime files from standalone output;
// copy next-server compiled runtimes to vendor/next/dist/compiled/next-server.
const nextServerSrc = path.join(
  root,
  "node_modules",
  "next",
  "dist",
  "compiled",
  "next-server"
);
const nextServerDest = path.join(
  staging,
  "vendor",
  "next",
  "dist",
  "compiled",
  "next-server"
);
await copy(nextServerSrc, nextServerDest);

// 3. Stage the Puppeteer-downloaded Chrome for Testing into build/chrome/.
//    The cache layout and the executable's relative path inside it vary per
//    OS/arch; the whole browser directory is staged, and the resolved
//    relative executable path is written to build/chrome/executable.json so
//    electron/main.cjs doesn't need its own copy of this mapping.
const PLATFORMS = {
  "darwin-arm64": {
    cachePrefix: "mac_arm-",
    browserDir: "chrome-mac-arm64",
    executable:
      "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  },
  "darwin-x64": {
    cachePrefix: "mac-",
    browserDir: "chrome-mac-x64",
    executable:
      "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  },
  "win32-x64": {
    cachePrefix: "win64-",
    browserDir: "chrome-win64",
    executable: "chrome.exe",
  },
  "linux-x64": {
    cachePrefix: "linux-",
    browserDir: "chrome-linux64",
    executable: "chrome",
  },
};

const platform = PLATFORMS[`${process.platform}-${process.arch}`];
if (!platform) {
  console.error(`Unsupported platform: ${process.platform}-${process.arch}`);
  process.exit(1);
}

const cacheRoot = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
let candidates = [];
try {
  candidates = (await fs.readdir(cacheRoot))
    .filter(
      (d) =>
        d.startsWith(platform.cachePrefix) &&
        // "mac-" (Intel) is a prefix of "mac_arm-" — keep them disjoint.
        !(platform.cachePrefix === "mac-" && d.startsWith("mac_arm-"))
    )
    .sort();
} catch {
  // cache dir missing entirely
}
const chrome = candidates.at(-1);
if (!chrome) {
  console.error(
    `No Puppeteer Chrome (${process.platform}-${process.arch}) found in ` +
      "~/.cache/puppeteer/chrome.\n" +
      "Run: npx puppeteer browsers install chrome"
  );
  process.exit(1);
}
const chromeDest = path.join(root, "build", "chrome");
// Start clean: re-copying over a previous stage trips on the .app's internal
// framework symlinks (mac).
await fs.rm(chromeDest, { recursive: true, force: true });
await copy(
  path.join(cacheRoot, chrome, platform.browserDir),
  path.join(chromeDest, platform.browserDir)
);
await fs.writeFile(
  path.join(chromeDest, "executable.json"),
  JSON.stringify({ executable: path.join(platform.browserDir, platform.executable) })
);

console.log(`Standalone server prepared; staged Chrome from ${chrome}`);
