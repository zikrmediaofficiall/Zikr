import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { findDuplicateMigrationVersions } from "../lib/migration-version-contract.mjs";

const unique = [
  "20261117010000_restrict_quran_audio_public_columns.sql",
  "20261117020000_harden_public_stories_read_policy.sql",
  "20261117030000_add_other_contract.sql",
];
assert.deepEqual(findDuplicateMigrationVersions(unique), []);

const collision = [
  "20261117010000_restrict_quran_audio_public_columns.sql",
  "20261117010000_stories_public_rls_requires_approved_global_rows.sql",
];
assert.deepEqual(findDuplicateMigrationVersions(collision), [
  {
    version: "20261117010000",
    first: collision[0],
    duplicate: collision[1],
  },
]);

assert.deepEqual(
  findDuplicateMigrationVersions([
    "legacy_without_version.sql",
    "20261117010000_first.sql",
    "not-a-version.sql",
    "20261117010000_second.sql",
    "20261117020000_third.sql",
  ]),
  [
    {
      version: "20261117010000",
      first: "20261117010000_first.sql",
      duplicate: "20261117010000_second.sql",
    },
  ],
);

const remoteHistoryMarkers = [
  "20261121060558_20261121070000_expand_video_template_assets.sql",
  "20261121060604_20261121080000_enable_safe_qa_failed_video_asset_deletion.sql",
];
for (const filename of remoteHistoryMarkers) {
  const marker = readFileSync("supabase/migrations/" + filename, "utf8");
  assert.match(marker, /^\s*(?:--[^\n]*\n)*SELECT\s+1\s*;\s*$/i);
}

const validator = readFileSync("scripts/validate-migrations.mjs", "utf8");
assert.match(validator, /findDuplicateMigrationVersions\(files\)/);
assert.match(validator, /DUPLICATE_MIGRATION_VERSIONS/);
assert.doesNotMatch(validator, /Skipping duplicate migration version/);
assert.doesNotMatch(validator, /migrationScore/);
assert.match(
  validator,
  /const migrationsToApply = files;/,
  "the validator must never silently drop one of two migrations sharing a version",
);

console.log("MIGRATION_VERSION_UNIQUENESS_PASSED");
