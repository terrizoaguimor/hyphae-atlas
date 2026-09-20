import {access, mkdir, rm} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";
import {judgeRequestDecision, validateJudgeBaseUrl} from "./lib/judge-request-policy.mjs";

const baseUrl = validateJudgeBaseUrl(process.env.JUDGE_BASE_URL ?? "http://127.0.0.1:3000");
const locale = process.env.JUDGE_LOCALE === "es" ? "es" : "en";
const output = path.resolve(process.cwd(), process.env.JUDGE_VIDEO_PATH ?? `artifacts-local/judge-mode.${locale}.webm`);
const poster = path.resolve(process.cwd(), process.env.JUDGE_POSTER_PATH ?? `artifacts-local/judge-mode.${locale}.webp`);
const candidates = [process.env.CHROMIUM_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium", "/snap/bin/chromium"].filter(Boolean);
let executablePath;
for (const candidate of candidates) {try {await access(candidate); executablePath = candidate; break;} catch {}}
if (!executablePath) throw new Error("System Chromium was not found. Set CHROMIUM_PATH to its executable.");

const temporary = path.resolve(process.cwd(), "artifacts-local/.judge-recording");
await rm(temporary, {recursive: true, force: true});
await mkdir(temporary, {recursive: true});
await mkdir(path.dirname(output), {recursive: true});
await mkdir(path.dirname(poster), {recursive: true});
const browser = await chromium.launch({executablePath, headless: true});
const context = await browser.newContext({viewport: {width: 1440, height: 900}, locale: locale === "es" ? "es-ES" : "en-US", timezoneId: "UTC", colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block", recordVideo: {dir: temporary, size: {width: 1440, height: 900}}});
const page = await context.newPage();
const blockedRequests = [];
await page.route("**/*", async (route) => {
  const request = route.request();
  const decision = judgeRequestDecision(baseUrl, request.url(), request.method());
  if (!decision.allowed) {blockedRequests.push(decision); return route.abort("blockedbyclient");}
  return route.continue();
});
try {
  await page.goto(new URL(`/?judge=conflict&locale=${locale}`, baseUrl).toString(), {waitUntil: "networkidle"});
  await page.locator('[data-judge-mode="true"][data-result-ready="true"]').waitFor();
  const adjudication = page.locator("[data-adjudication-state]");
  await adjudication.waitFor();
  await page.waitForFunction(() => document.querySelector("[data-adjudication-state]")?.getAttribute("data-adjudication-state") !== "loading");
  const adjudicationState = await adjudication.getAttribute("data-adjudication-state");
  if (adjudicationState !== "available" && process.env.ALLOW_UNAVAILABLE_ADJUDICATION !== "1") throw new Error("The persisted G7 adjudication is unavailable; import it before recording the real demo.");
  await page.screenshot({path: poster, type: "webp", quality: 88, fullPage: false});
  await page.waitForTimeout(4_000);
  for (const [step, duration] of [["conflict", 4_000], ["report", 5_000], ["proof", 4_000], ["evaluation", 5_000]]) {
    await page.locator(`[data-judge-step-target="${step}"]`).click();
    await page.locator(`[data-judge-step="${step}"]`).waitFor();
    await page.waitForTimeout(duration);
  }
  if (blockedRequests.length) throw new Error(`Judge Mode attempted disallowed requests: ${JSON.stringify(blockedRequests)}`);
  const video = page.video();
  await context.close();
  if (!video) throw new Error("Playwright did not create a video artifact");
  await video.saveAs(output);
  console.log(JSON.stringify({recorded: path.relative(process.cwd(), output), poster: path.relative(process.cwd(), poster), locale, chromium: executablePath, requestPolicy: "loopback GET/HEAD only", blockedRequests}, null, 2));
} finally {
  if (page.context().pages().length) await context.close().catch(() => {});
  await browser.close();
  await rm(temporary, {recursive: true, force: true});
}
