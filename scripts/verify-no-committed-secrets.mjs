import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

// OMNIS P12-02: fail when a tracked file contains a live-looking credential.
// Only file:line and the rule name are printed, never the matched value.
const RULES = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/],
  ["Vercel token", /\bvcp_[A-Za-z0-9]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Stripe live key", /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ["JWT with service_role claim", /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{20,}/],
];
const SKIP = /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|.*\.(?:png|jpe?g|webp|gif|ico|mp3|mp4|woff2?|apk|aab|jar|keystore|jks|zip|pdf))$/i;
const SELF = "scripts/verify-no-committed-secrets.mjs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter(Boolean);
const findings = [];
for (const file of files) {
  if (file === SELF || SKIP.test(file)) continue;
  let size = 0;
  try { size = statSync(file).size; } catch { continue; }
  if (size > 2_000_000) continue;
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  if (text.includes("\0")) continue;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].length > 4000) continue;
    for (const [name, pattern] of RULES) {
      if (pattern.test(lines[i])) findings.push(`${file}:${i + 1} ${name}`);
    }
  }
}
if (findings.length) {
  console.error(`Committed secret scan failed (${findings.length} finding(s); values withheld):`);
  for (const finding of findings) console.error(` - ${finding}`);
  process.exit(1);
}
console.log(`Committed secret scan passed (${files.length} tracked files, ${RULES.length} rules).`);
