// Post-`next build` step for the Electron bundle. The standalone server does
// not copy public/ or .next/static itself (Next expects a CDN), and the
// Puppeteer Chromium must be staged so electron-builder can ship it in the
// app's resources. Cross-platform: mac (arm64/x64), Windows, Linux.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
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


// Stage Turbopack's external server packages (.next/node_modules) for the built app.
//
// Background: Turbopack compiles serverExternalPackages (puppeteer, puppeteer-core,
// @puppeteer/browsers) as externalImport() calls that do await import("<pkg>-<hash>").
// ESM import() resolution walks up the filesystem looking for a directory literally
// named node_modules/ — it does NOT honour NODE_PATH. From the built app's
// .next/server/chunks/ the walk finds .next/node_modules/ and stops there. So that
// directory must contain, as REAL directories (no symlinks — electron-builder and
// Windows packaging mangle them):
//   1. the hashed alias itself (e.g. puppeteer-<hash> → the real puppeteer package)
//   2. the FULL dependency closure of the externals (puppeteer-core imports
//      chromium-bidi, devtools-protocol, … which Next's standalone tracing omits,
//      so vendor/ alone is not enough)
// With everything flat in one node_modules/, each package's own bare imports
// resolve by walking up from wherever it was loaded.
const nextNodeModules = path.join(root, ".next", "node_modules");
const require = createRequire(path.join(root, "package.json"));
try {
  const stagedNextModules = path.join(staging, ".next", "node_modules");
  await fs.rm(stagedNextModules, { recursive: true, force: true });

  // Copy a package (by resolved real path, dereferencing pnpm symlinks) into the
  // staged node_modules under its package name.
  const stagedPkgs = new Map(); // name -> real dir already staged
  async function stagePackage(name, realDir) {
    if (stagedPkgs.has(name)) return;
    stagedPkgs.set(name, realDir);
    await fs.cp(realDir, path.join(stagedNextModules, name), {
      recursive: true,
      dereference: true,
    });
  }

  // Breadth-first walk of the dependency closure, resolving each dependency from
  // its parent's real location (this is what makes pnpm's isolated layout work).
  // Keep the seed list in sync with serverExternalPackages in next.config.ts.
  const queue = ["puppeteer", "puppeteer-core", "@puppeteer/browsers"].map(
    (name) => ({ name, fromDir: root })
  );
  while (queue.length > 0) {
    const { name, fromDir } = queue.shift();
    if (stagedPkgs.has(name)) continue;
    // Resolve the package's own package.json. Some packages hide it behind an
    // "exports" map (ERR_PACKAGE_PATH_NOT_EXPORTED), so fall back to resolving
    // the entry point and walking up to the nearest package.json.
    let pkgJsonPath;
    try {
      pkgJsonPath = require.resolve(`${name}/package.json`, {
        paths: [fromDir],
      });
    } catch {
      try {
        let dir = path.dirname(require.resolve(name, { paths: [fromDir] }));
        for (;;) {
          try {
            await fs.access(path.join(dir, "package.json"));
            pkgJsonPath = path.join(dir, "package.json");
            break;
          } catch {
            const parent = path.dirname(dir);
            if (parent === dir) throw new Error("package.json not found");
            dir = parent;
          }
        }
      } catch {
        // Optional/peer dep not installed — puppeteer runs fine without it.
        console.warn(`Warning: could not resolve ${name} from ${fromDir}`);
        continue;
      }
    }
    const realDir = await fs.realpath(path.dirname(pkgJsonPath));
    await stagePackage(name, realDir);
    const pkgJson = JSON.parse(
      await fs.readFile(path.join(realDir, "package.json"), "utf8")
    );
    for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
      if (!stagedPkgs.has(dep)) queue.push({ name: dep, fromDir: realDir });
    }
  }

  // Stage every Turbopack hashed alias (e.g. "puppeteer-582bc9288a971b4a" →
  // puppeteer) as a real copy of the package it points to.
  let aliases = [];
  try { aliases = await fs.readdir(nextNodeModules); } catch { /* ok */ }
  for (const alias of aliases) {
    let realTarget;
    try {
      realTarget = await fs.realpath(path.join(nextNodeModules, alias));
    } catch {
      continue;
    }
    const realPkg = path.basename(realTarget);
    const realDir = stagedPkgs.get(realPkg) ?? realTarget;
    await fs.cp(realDir, path.join(stagedNextModules, alias), {
      recursive: true,
      dereference: true,
    });
  }
} catch (e) {
  console.warn("Warning: could not stage .next/node_modules:", e.message);
}


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
const execPath = path.join(
  chromeDest,
  platform.browserDir,
  platform.executable
);
try {
  await fs.chmod(execPath, 0o755);
} catch {
  // ignore if not supported
}

console.log(`Standalone server prepared; staged Chrome from ${chrome}`);
