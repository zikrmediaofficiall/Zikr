export function shouldFallbackToExternalHadith<T>(
  databaseResult: T[] | null,
): databaseResult is null {
  return databaseResult === null;
}
