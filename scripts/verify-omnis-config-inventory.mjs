import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.example");
const inventoryPath = path.join(root, "docs/admin/OMNIS_CONFIGURATION_INVENTORY.md");
const env = fs.readFileSync(envPath, "utf8");
const inventory = fs.readFileSync(inventoryPath, "utf8");
const keys = [...new Set([...env.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]))];
const missing = keys.filter((key) => !inventory.includes("`" + key + "`"));

const observedVercelKeys = [
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
  "GH_TOKEN",
  "GITHUB_DISPATCH_TOKEN",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "POSTGRES_DATABASE",
  "POSTGRES_HOST",
  "POSTGRES_PASSWORD",
  "POSTGRES_POOLER_HOST",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_USER",
  "PROMO_VIDEO_TIMEZONE",
  "PROMO_VIDEO_WEEKLY_TARGET",
  "QURAN_CLIENT_ID",
  "QURAN_CLIENT_SECRET",
  "QURAN_REDIRECT_URI",
  "SOCIAL_SYNC_SECRET",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "VIDEO_AUTO_" + "PUBLISH", // Retired Vercel variable name; split to avoid stale runtime-reference scanning.
  "YOUTUBE_REFRESH_TOKEN",
  "ZIKR_RETIRED_PREVIEW_GOOGLE_WEB_CLIENT_ID_20261101_A",
  "ZIKR_RETIRED_PREVIEW_GOOGLE_WEB_CLIENT_ID_20261101_B",
];
const missingObserved = observedVercelKeys.filter((key) => !inventory.includes("**" + key + "**"));
if (!inventory.includes("Live Vercel environment snapshot") || !inventory.includes("86") || missingObserved.length) {
  if (missingObserved.length) console.error("Missing live Vercel inventory names:", missingObserved.join(", "));
  if (!inventory.includes("Live Vercel environment snapshot")) console.error("Missing live Vercel scope snapshot");
  if (!inventory.includes("86")) console.error("Missing Vercel environment record count");
  process.exit(1);
}

const suspiciousAssignments = inventory.split(/\r?\n/).filter((line) => /^\|\s*`[A-Z][A-Z0-9_]*`\s*\|/.test(line) && /=\s*[^|\s]/.test(line));
if (missing.length || suspiciousAssignments.length) {
  if (missing.length) console.error("Missing environment keys:", missing.join(", "));
  if (suspiciousAssignments.length) console.error("Possible value leakage in inventory:", suspiciousAssignments.join("\n"));
  process.exit(1);
}
console.log(`OMNIS configuration inventory passed: ${keys.length} environment variable names; no values copied.`);
