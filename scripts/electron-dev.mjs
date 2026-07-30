// Dev loop for the Electron shell: run `next dev`, wait for it, then launch
// Electron against it (CV_ELECTRON_DEV=1 makes main.cjs skip forking a server).
import { spawn } from "node:child_process";
import electronPath from "electron";

const DEV_URL = "http://localhost:3000";

const dev = spawn("npm", ["run", "dev"], { stdio: "inherit" });

async function waitForDev() {
  for (;;) {
    try {
      const res = await fetch(DEV_URL);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

await waitForDev();

const electron = spawn(electronPath, ["."], {
  stdio: "inherit",
  env: { ...process.env, CV_ELECTRON_DEV: "1" },
});

electron.on("exit", (code) => {
  dev.kill();
  process.exit(code ?? 0);
});
process.on("SIGINT", () => {
  electron.kill();
  dev.kill();
});
