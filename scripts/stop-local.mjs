import {readFileSync, rmSync} from "node:fs";
import path from "node:path";

const pidPath = path.join(process.cwd(), "artifacts-local", "dev-server.pid");
let pid;
try {pid = Number(readFileSync(pidPath, "utf8").trim());} catch {console.log(JSON.stringify({stopped: false, reason: "No PID file"})); process.exit(0);}
if (!Number.isInteger(pid) || pid <= 0) throw new Error("Invalid dev server PID");
let command = "";
try {command = readFileSync(`/proc/${pid}/cmdline`, "utf8");} catch {}
if (command && !command.includes("next")) throw new Error("PID does not belong to a Next.js process; refusing to stop it");
try {process.kill(-pid, "SIGTERM");} catch {try {process.kill(pid, "SIGTERM");} catch {}}
rmSync(pidPath, {force: true});
console.log(JSON.stringify({stopped: true, pid}));
