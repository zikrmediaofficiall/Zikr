import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261117040000_harden_prayer_scheduler_secret_entropy.sql",
  "utf8",
);

assert.match(
  migration,
  /replace\s*\(\s*gen_random_uuid\(\)::text\s*\|\|\s*gen_random_uuid\(\)::text,\s*'-',\s*''\s*\)/i,
  "the scheduler token must be built from two cryptographically generated UUIDs",
);
assert.match(
  migration,
  /on conflict\s*\(key\)\s*do update/i,
  "the migration must rotate an existing weak scheduler token as well as seed a missing row",
);
assert.match(
  migration,
  /coalesce\(current_settings\.value\s*->>\s*'secret',\s*''\)\s*!~\s*'\^\[0-9a-f\]\{64\}\$'/i,
  "only a missing or non-64-character-hex scheduler token may be rotated",
);
assert.match(
  migration,
  /if secret_value is null or secret_value !~ '\^\[0-9a-f\]\{64\}\$'/i,
  "the migration must fail closed if a strong scheduler token is not present after rotation",
);
// The migration documents the retired expression in SQL comments. Inspect executable
// SQL only so a safety comment cannot make the regression fail falsely.
const executableSql = migration.replace(/^\s*--.*$/gm, "");
assert.doesNotMatch(
  executableSql,
  /md5\s*\(\s*random\s*\(/i,
  "the weak MD5(random()) construction must not remain in executable migration SQL",
);
assert.doesNotMatch(
  migration,
  /\b(delete\s+from|truncate)\b/i,
  "the migration must not delete or truncate data",
);

console.log("PRAYER_SCHEDULER_SECRET_ENTROPY_PASSED");
