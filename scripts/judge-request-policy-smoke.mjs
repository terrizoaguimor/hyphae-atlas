import {strict as assert} from "node:assert";
import {judgeRequestDecision, validateJudgeBaseUrl} from "./lib/judge-request-policy.mjs";

const base = validateJudgeBaseUrl("http://127.0.0.1:3000");
for (const method of ["GET", "HEAD"]) assert.equal(judgeRequestDecision(base, `http://127.0.0.1:3000/${method.toLowerCase()}`, method).allowed, true);
for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
  const decision = judgeRequestDecision(base, "http://127.0.0.1:3000/api/adjudications/g7", method);
  assert.deepEqual({allowed: decision.allowed, reason: decision.reason, method: decision.method}, {allowed: false, reason: "method", method});
}
assert.equal(judgeRequestDecision(base, "https://example.invalid/script.js", "GET").reason, "cross-origin");
assert.throws(() => validateJudgeBaseUrl("https://atlas.example.com"), /loopback/);
console.log(JSON.stringify({ok: true, checks: ["loopback-base", "get-head-only", "mutation-block", "cross-origin-block"]}));
