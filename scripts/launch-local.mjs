import {mkdirSync, openSync, readFileSync, writeFileSync} from "node:fs";
import {spawn} from "node:child_process";
import path from "node:path";

const root = process.cwd();
const runtimeDirectory = path.join(root, "artifacts-local");
const pidPath = path.join(runtimeDirectory, "dev-server.pid");
const logPath = path.join(runtimeDirectory, "dev-server.log");
mkdirSync(runtimeDirectory, {recursive: true, mode: 0o700});

try {
  const existing = Number(readFileSync(pidPath, "utf8").trim());
  if (existing > 0) {
    process.kill(existing, 0);
    console.log(JSON.stringify({started: false, alreadyRunning: true, pid: existing, url: "http://127.0.0.1:3000", logPath}));
    process.exit(0);
  }
} catch {}

const log = openSync(logPath, "a", 0o600);
const nextBinary = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBinary, "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", log, log],
  env: process.env,
});
child.unref();
writeFileSync(pidPath, `${child.pid}\n`, {mode: 0o600});
console.log(JSON.stringify({started: true, pid: child.pid, url: "http://127.0.0.1:3000", logPath}));
