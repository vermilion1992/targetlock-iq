/**
 * Production start for Railway and local standalone builds.
 * Binds 0.0.0.0, uses PORT (default 8080), copies static assets into standalone output.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, "..");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "8080";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const hostname = process.env.HOSTNAME;
const port = process.env.PORT;
const standaloneDir = join(pkgRoot, ".next", "standalone");
const serverJs = join(standaloneDir, "server.js");

function copyStandaloneAssets() {
  const staticSrc = join(pkgRoot, ".next", "static");
  const staticDest = join(standaloneDir, ".next", "static");
  const publicSrc = join(pkgRoot, "public");
  const publicDest = join(standaloneDir, "public");

  if (existsSync(staticSrc)) {
    cpSync(staticSrc, staticDest, { recursive: true });
  }
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, publicDest, { recursive: true });
  }
}

function runChild(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} killed by signal ${signal}`));
      } else {
        resolve(code ?? 0);
      }
    });
  });
}

async function main() {
  console.log(
    `[start-railway] Listening on http://${hostname}:${port} (${existsSync(serverJs) ? "standalone" : "next start"})`
  );

  if (existsSync(serverJs)) {
    copyStandaloneAssets();
    const code = await runChild("node", ["server.js"], { cwd: standaloneDir });
    process.exit(code);
  }

  const nextBin = join(pkgRoot, "node_modules", "next", "dist", "bin", "next");
  if (existsSync(nextBin)) {
    const code = await runChild(
      process.execPath,
      [nextBin, "start", "-H", hostname, "-p", port],
      { cwd: pkgRoot }
    );
    process.exit(code);
  }

  const code = await runChild("npx", ["next", "start", "-H", hostname, "-p", port], {
    cwd: pkgRoot,
    shell: true,
  });
  process.exit(code);
}

main().catch((err) => {
  console.error("[start-railway] Failed to start:", err);
  process.exit(1);
});
