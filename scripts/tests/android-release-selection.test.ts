import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectAndroidRelease } from "../../src/features/releases/android-release-selection";

const latestStable = { tag_name: "v1.1.15" };
const olderPinned = { tag_name: "v1.1.14" };

assert.equal(
  selectAndroidRelease(latestStable, olderPinned),
  olderPinned,
  "an explicitly pinned older stable release must remain selected to hold rollout",
);
assert.equal(
  selectAndroidRelease(latestStable, null),
  latestStable,
  "automatic mode must continue to select the latest stable release",
);
assert.equal(
  selectAndroidRelease(null, olderPinned),
  olderPinned,
  "a validated pin remains usable when latest-release discovery is unavailable",
);
assert.equal(
  selectAndroidRelease(null, null),
  null,
  "selection must return null when neither a stable release nor a valid pin exists",
);

const service = readFileSync(
  "src/features/releases/services/github-android-release.ts",
  "utf8",
);
assert.match(service, /setting\.mode === "pinned" && setting\.releaseTag/);
assert.match(service, /getStableReleaseByTag\(setting\.releaseTag\)/);
assert.match(service, /return selectAndroidRelease\(latestStable, pinnedRelease\)/);

for (const path of [
  "src/app/api/app-version/route.ts",
  "src/app/api/download/android/route.ts",
  "src/app/api/download/android/aab/route.ts",
]) {
  const source = readFileSync(path, "utf8");
  assert.match(source, /getSelectedAndroidRelease/);
  assert.match(source, /await getSelectedAndroidRelease\(\)/);
  assert.doesNotMatch(source, /getLatestStableAndroidRelease/);
}

console.log("Android release pin selection and metadata/download parity contracts passed.");
