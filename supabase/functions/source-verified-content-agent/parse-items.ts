export type SourceItem = {
  externalId: string;
  title: string | null;
  body: string | null;
  sourceUrl: string;
  metadata: Record<string, unknown>;
};

export type SourceParseSkipReason = "catalog_only_source" | "parser_not_implemented";

export type SourceParseOutcome =
  | { kind: "items"; items: SourceItem[] }
  | { kind: "skipped"; reason: SourceParseSkipReason };

export function getSourceParserSkipReason(source: { parser_key: string }): SourceParseSkipReason {
  if (source.parser_key === "alquran_cloud") return "catalog_only_source";
  return "parser_not_implemented";
}

/**
 * Keep source ingestion explicit: a successful HTTP fetch is not a successful
 * editorial ingestion when no reviewed provider parser exists.
 */
export function parseSourceItems(
  source: { parser_key: string },
  _payload: unknown,
  _retrievedAt: string,
): SourceParseOutcome {
  const skipReason = getSourceParserSkipReason(source);
  if (skipReason) return { kind: "skipped", reason: skipReason };

  // Credentialed providers remain disabled until a provider-specific parser
  // has been implemented and reviewed.
  return { kind: "skipped", reason: "parser_not_implemented" };
}


export type SourceAgentRunStatus = "succeeded" | "partial" | "failed";

/**
 * A run with unsupported/catalog-only sources is not a full success even when
 * no request threw. Keep the database status inside its declared CHECK set.
 */
export function getSourceAgentRunStatus(summary: {
  queued: number;
  skipped: number;
  failed: number;
}): SourceAgentRunStatus {
  if (summary.failed > 0) return summary.queued > 0 ? "partial" : "failed";
  if (summary.skipped > 0) return "partial";
  return "succeeded";
}
