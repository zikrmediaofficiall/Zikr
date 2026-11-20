import {
  isPublicSearchResultType,
  type PublicSearchResultType,
} from "./services/search-contract";

export type PublicSearchResult = {
  id: string;
  type: PublicSearchResultType;
  labelAr: string;
  title: string;
  subtitle: string;
  href: string;
};

export function mapPublicSearchRows(rows: unknown[]): PublicSearchResult[] {
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];

    const row = value as Record<string, unknown>;
    const { id, type, label_ar, title, subtitle, href } = row;
    if (
      typeof id !== "string" ||
      !isPublicSearchResultType(type) ||
      typeof label_ar !== "string" ||
      typeof title !== "string" ||
      typeof subtitle !== "string" ||
      typeof href !== "string" ||
      !href.startsWith("/") ||
      href.startsWith("//")
    ) {
      return [];
    }

    return [{
      id,
      type,
      labelAr: label_ar,
      title,
      subtitle,
      href,
    }];
  });
}
