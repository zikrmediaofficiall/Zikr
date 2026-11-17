/**
 * Supabase migration versions are the numeric filename prefixes. They must be
 * unique across the active migration directory; selecting one duplicate by
 * content score can silently omit a required schema/security migration.
 */
export function findDuplicateMigrationVersions(files) {
  const firstByVersion = new Map();
  const duplicates = [];

  for (const file of files) {
    const name = String(file).split(/[\\/]/).pop() ?? String(file);
    const match = /^(\d+)_/.exec(name);
    if (!match) continue;

    const version = match[1];
    const first = firstByVersion.get(version);
    if (first) {
      duplicates.push({ version, first, duplicate: file });
    } else {
      firstByVersion.set(version, file);
    }
  }

  return duplicates;
}
