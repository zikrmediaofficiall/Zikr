export const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export function buildNominatimReverseUrl(
  baseUrl: string,
  latitude: number,
  longitude: number,
): string {
  const base = new URL(baseUrl);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error("Nominatim base URL must be a clean HTTPS origin/path.");
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  const endpoint = new URL(basePath + "/reverse", base.origin);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("zoom", "10");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("accept-language", "ar,en");
  return endpoint.toString();
}
