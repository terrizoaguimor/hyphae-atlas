import {execFileSync, spawnSync} from "node:child_process";
import {existsSync, readFileSync, readdirSync, rmSync, statSync} from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, ".cloudflare-deploy");
const mode = process.argv.includes("--deploy") ? "deploy" : "build";
const status = execFileSync("git", ["status", "--porcelain"], {cwd: root, encoding: "utf8"}).trim();
if (status) throw new Error("Cloudflare clean-room build requires a clean committed working tree");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {stdio: "inherit", ...options});
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`);
}

function parseSecrets() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return [];
  return readFileSync(envPath, "utf8").split("\n").flatMap((line) => {
    const trimmed = line.trim(); if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
    const [key, ...rest] = trimmed.split("="); const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key.startsWith("NEXT_PUBLIC_")) return [];
    return /(KEY|TOKEN|SECRET)/.test(key) && value.length >= 12 ? [value] : [];
  });
}

function filesUnder(directory) {
  const output = [];
  for (const name of readdirSync(directory)) {const candidate = path.join(directory, name); if (statSync(candidate).isDirectory()) output.push(...filesUnder(candidate)); else output.push(candidate);}
  return output;
}

rmSync(target, {recursive: true, force: true});
run("git", ["clone", "--quiet", "--local", "--no-hardlinks", root, target], {cwd: root});
const buildEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NODE_ENV: "production",
  MODEL_PROVIDER: "xai",
  XAI_MODEL: "grok-4.6",
  SANITY_PROJECT_ID: "v2ulbd4b",
  SANITY_DATASET: "production",
  SANITY_API_VERSION: "2026-09-18",
  APP_URL: "https://atlas.terrizoaguimor.dev",
  NEXT_PUBLIC_TURNSTILE_ENABLED: "true",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAAE9SaZu7Zihashsh",
};
run("npm", ["ci"], {cwd: target, env: buildEnv});
run("npm", ["run", "opennext:build"], {cwd: target, env: buildEnv});
const secrets = parseSecrets();
const leaked = [];
for (const file of filesUnder(path.join(target, ".open-next"))) {
  const bytes = readFileSync(file);
  if (secrets.some((secret) => bytes.includes(Buffer.from(secret)))) leaked.push(path.relative(target, file));
}
if (leaked.length) throw new Error(`Clean-room bundle contains local secret values: ${leaked.join(", ")}`);
console.log(JSON.stringify({cleanRoomBuild: true, commit: execFileSync("git", ["rev-parse", "HEAD"], {cwd: target, encoding: "utf8"}).trim(), scannedFiles: filesUnder(path.join(target, ".open-next")).length, secretValuesChecked: secrets.length, leaks: 0}, null, 2));
if (mode === "deploy") {
  for (const name of ["CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL", "CLOUDFLARE_ACCOUNT_ID"]) if (!process.env[name]) throw new Error(`${name} is required for deployment`);
  const deployEnv = {PATH: process.env.PATH, HOME: process.env.HOME, CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL: process.env.CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID};
  run("npm", ["exec", "wrangler", "--", "deploy"], {cwd: target, env: deployEnv});
}
