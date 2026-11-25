export const REQUIRED_TABLES: string[];
export function analyzeDump(sql: string, required?: string[]): { ok: boolean; tables: number; rowsByTable: Record<string, number>; problems: string[] };
