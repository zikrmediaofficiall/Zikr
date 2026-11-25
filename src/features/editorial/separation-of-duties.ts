export function isSeparationOfDutiesEnforced(env: Record<string, string | undefined> = process.env): boolean {
  return env.EDITORIAL_SOD_ENFORCED === "true";
}

/**
 * Returns an Arabic error message when the actor may not approve the item.
 * Items without a recorded creator are not blocked (legacy rows).
 */
export function separationOfDutiesProblem(input: {
  enforced: boolean;
  actorId: string;
  createdBy: string | null | undefined;
}): string | null {
  if (!input.enforced) return null;
  if (input.createdBy && input.createdBy === input.actorId) {
    return "لا يمكن لمنشئ المحتوى اعتماده بنفسه. يجب أن يعتمده مشرف آخر.";
  }
  return null;
}
