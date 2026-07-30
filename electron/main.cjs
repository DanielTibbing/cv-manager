// Electron main process. The app is the existing Next.js server served on a
// loopback port; this file just hosts it in a native window.
//
// Packaged: fork the standalone Next server (resources/app-server/server.js)
// with ELECTRON_RUN_AS_NODE, point storage at the user-data dir and Puppeteer
// at the bundled Chromium. Dev (CV_ELECTRON_DEV=1): attach to `next dev`.
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { fork } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const DEV = process.env.CV_ELECTRON_DEV === "1";
const DEV_URL = "http://localhost:3000";

let serverProcess = null;
let exportsDir = null;

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
  const port = await freePort();
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
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing"
        ),
        // electron-builder strips top-level node_modules from extraResources,
        // so the staged server resolves its dependencies via NODE_PATH.
        NODE_PATH: path.join(process.resourcesPath, "app-server", "vendor"),
      },
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    }
  );
  serverProcess.on("exit", (code) => {
    serverProcess = null;
    if (code && code !== 0) {
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
app.on("will-quit", () => serverProcess?.kill());

main();
