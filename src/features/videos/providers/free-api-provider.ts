import type { VideoGenerationInput, VideoGenerationResult, VideoProvider } from "./types";
import { readBoundedMediaResponse } from "./media-response";

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) &&
    host.includes(".") &&
    !host.startsWith(".") &&
    !host.endsWith(".") &&
    !host.includes("..") &&
    host !== "localhost" &&
    !host.endsWith(".localhost") &&
    !host.endsWith(".local") &&
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) &&
    !host.includes(":");
}

function parseFreeVideoProviderEndpoint(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !isPublicHostname(url.hostname)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

export function resolveFreeVideoProviderDownloadUrl(
  value: unknown,
  endpoint: string,
  configuredHosts = "",
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const endpointUrl = parseFreeVideoProviderEndpoint(endpoint);
  if (!endpointUrl) return null;

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      url.pathname === "/" ||
      !isPublicHostname(url.hostname)
    ) return null;

    const allowedHosts = new Set([endpointUrl.hostname.toLowerCase()]);
    for (const configuredHost of configuredHosts.split(",")) {
      const host = configuredHost.trim().toLowerCase();
      if (host && isPublicHostname(host)) allowedHosts.add(host);
    }
    if (!allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export class FreeApiVideoProvider implements VideoProvider {
  readonly name = "free_api" as const;
  private readonly endpoint = process.env.FREE_VIDEO_PROVIDER_URL?.trim() ?? "";
  private readonly token = process.env.FREE_VIDEO_PROVIDER_TOKEN?.trim() ?? "";
  private readonly allowedHosts = process.env.FREE_VIDEO_PROVIDER_ALLOWED_HOSTS ?? "";

  async isAvailable() {
    return Boolean(this.token && parseFreeVideoProviderEndpoint(this.endpoint));
  }

  async generate(input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const endpoint = parseFreeVideoProviderEndpoint(this.endpoint);
    if (!endpoint || !this.token) {
      return { ok: false, provider: this.name, error: "Free video API requires an HTTPS endpoint and server-side token." };
    }
    try {
      const response = await fetch(endpoint.toString(), {
        method: "POST",
        headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
        body: JSON.stringify({ requestId: input.requestId, title: input.title, text: input.text, format: input.format, durationSeconds: input.durationSeconds }),
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) return { ok: false, provider: this.name, error: `Free video API failed (HTTP ${response.status}).` };
      const payload = await readBoundedMediaResponse(response, 64 * 1024);
      const data = JSON.parse(new TextDecoder().decode(payload)) as { videoUrl?: string; jobId?: string };
      const videoUrl = resolveFreeVideoProviderDownloadUrl(data.videoUrl, endpoint.toString(), this.allowedHosts);
      if (!videoUrl) {
        return {
          ok: false,
          provider: this.name,
          providerJobId: data.jobId,
          error: "Free video API returned a URL outside the configured HTTPS host allowlist.",
        };
      }
      return { ok: true, provider: this.name, videoUrl, providerJobId: data.jobId, audioPresent: true };
    } catch {
      return { ok: false, provider: this.name, error: "Free video API request failed or returned an oversized response." };
    }
  }
}
