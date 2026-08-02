// Electron main process. The app is the existing Next.js server served on a
// loopback port; this file just hosts it in a native window.
//
// Packaged: fork the standalone Next server (resources/app-server/server.js)
// with ELECTRON_RUN_AS_NODE, point storage at the user-data dir and Puppeteer
// at the bundled Chromium. Dev (CV_ELECTRON_DEV=1): attach to `next dev`.
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { fork } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const DEV = process.env.CV_ELECTRON_DEV === "1";
const DEV_URL = "http://localhost:3000";

let serverProcess = null;
let exportsDir = null;
let logFile = null;
// Set on will-quit: the server exit that follows is our own kill, not a crash.
let quitting = false;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const userData = app.getPath("userData");
  exportsDir = path.join(userData, "exports");
  logFile = path.join(userData, "server.log");
  const logStream = fs.createWriteStream(logFile, { flags: "a" });

  const port = await freePort();
  // prepare-standalone stages the browser dir per OS/arch and records the
  // executable's relative path here (avoids duplicating the mapping).
  const { executable } = JSON.parse(
    fs.readFileSync(
      path.join(process.resourcesPath, "chrome", "executable.json"),
      "utf8"
    )
  );
  serverProcess = fork(
    path.join(process.resourcesPath, "app-server", "server.js"),
    [],
    {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        CV_DATA_DIR: path.join(userData, "data"),
        CV_EXPORTS_DIR: exportsDir,
        PUPPETEER_EXECUTABLE_PATH: path.join(
          process.resourcesPath,
          "chrome",
          executable
        ),
        // electron-builder strips top-level node_modules from extraResources,
        // so the staged server resolves its dependencies via NODE_PATH.
        // .next/node_modules/ holds Turbopack alias stubs (e.g. puppeteer-<hash>)
        // that re-export from vendor/; both paths must be on NODE_PATH so that
        // when the stub does require("puppeteer") it resolves from vendor/.
        NODE_PATH: [
          path.join(process.resourcesPath, "app-server", "vendor"),
          path.join(process.resourcesPath, "app-server", ".next", "node_modules"),
        ].join(path.delimiter),
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    }
  );

  serverProcess.stdout?.on("data", (chunk) => {
    logStream.write(chunk);
    process.stdout?.write(chunk);
  });
  serverProcess.stderr?.on("data", (chunk) => {
    logStream.write(chunk);
    process.stderr?.write(chunk);
  });
  serverProcess.on("exit", (code) => {
    serverProcess = null;
    if (!quitting && code && code !== 0) {
      dialog.showErrorBox(
        "CV Manager",
        `The app server stopped unexpectedly (exit ${code}). Please relaunch.`
      );
    }
  });
  return `http://127.0.0.1:${port}`;
}

async function waitForServer(baseUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`${baseUrl}/api/resumes`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the app server to start.");
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Reveal Exports Folder",
          enabled: !DEV,
          click: () => exportsDir && shell.openPath(exportsDir),
        },
        {
          label: "Reveal Server Log",
          enabled: !DEV,
          click: () => logFile && shell.openPath(logFile),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    // Without the Edit role menu, Cmd+C/V/X/A do nothing in text fields.
    { role: "editMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function main() {
  await app.whenReady();
  buildMenu();
  const baseUrl = DEV ? DEV_URL : await startServer();
  try {
    await waitForServer(baseUrl);
  } catch (err) {
    dialog.showErrorBox("CV Manager", err.message);
    app.quit();
    return;
  }
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    // Plain web contents: no Node in the renderer, nothing to sandbox off.
  });
  win.loadURL(baseUrl);
}

app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => {
  quitting = true;
  serverProcess?.kill();
});

main();
