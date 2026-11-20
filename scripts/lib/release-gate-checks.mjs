export const ANDROID_DEBUG_PATH_FILTERS = Object.freeze([
  ".github/workflows/android-native-login-test.yml",
  "android/**",
  "capacitor.config.json",
  "package.json",
  "pnpm-lock.yaml",
  "src/features/auth/**",
  "src/components/layout/native-*.tsx",
  "src/lib/auth/native-*.ts",
  "scripts/verify-mobile-readiness.mjs",
  "scripts/tests/native-google-oauth-contract.test.mjs"
]);

export const CIRCLECI_VALIDATION_PATH_FILTERS = Object.freeze([
  ".circleci/config.yml",
  ".github/workflows/circleci-config-validation.yml"
]);

function matchesWorkflowPath(filePath, pattern) {
  if (pattern.endsWith("/**")) return filePath.startsWith(pattern.slice(0, -2));
  const wildcardIndex = pattern.indexOf("*");
  if (wildcardIndex < 0) return filePath === pattern;
  const prefix = pattern.slice(0, wildcardIndex);
  const suffix = pattern.slice(wildcardIndex + 1);
  if (!filePath.startsWith(prefix) || !filePath.endsWith(suffix)) return false;
  const middle = filePath.slice(prefix.length, filePath.length - suffix.length);
  return middle.length > 0 && !middle.includes("/");
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => matchesWorkflowPath(filePath, pattern));
}

/**
 * Return only PR-head checks whose path-filtered workflows should have run.
 * The canonical Quality Gate remains mandatory for every pull request.
 */
export function getRequiredPullRequestCheckNames(changedPaths) {
  if (!Array.isArray(changedPaths) || changedPaths.some((path) => typeof path !== "string" || !path.trim())) {
    throw new TypeError("changedPaths must be an array of non-empty repository paths");
  }

  const required = ["ZIKR / Quality Gate"];
  if (changedPaths.some((path) => matchesAny(path, ANDROID_DEBUG_PATH_FILTERS))) {
    required.push("Build Android Debug APK");
  }
  if (changedPaths.some((path) => matchesAny(path, CIRCLECI_VALIDATION_PATH_FILTERS))) {
    required.push("Validate CircleCI configuration");
  }
  return required;
}
