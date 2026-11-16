import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildNominatimReverseUrl } from "../../src/lib/location/nominatim";

const endpoint = new URL(
  buildNominatimReverseUrl("https://geo.example/nominatim/", 30.0444, 31.2357),
);
assert.equal(endpoint.origin, "https://geo.example");
assert.equal(endpoint.pathname, "/nominatim/reverse");
assert.equal(endpoint.searchParams.get("format"), "jsonv2");
assert.equal(endpoint.searchParams.get("lat"), "30.0444");
assert.equal(endpoint.searchParams.get("lon"), "31.2357");
assert.equal(endpoint.searchParams.get("zoom"), "10");
assert.equal(endpoint.searchParams.get("addressdetails"), "1");
assert.equal(endpoint.searchParams.get("accept-language"), "ar,en");
assert.throws(
  () => buildNominatimReverseUrl("http://geo.example", 30, 31),
  /HTTPS/,
);
assert.throws(
  () => buildNominatimReverseUrl("https://user:pass@geo.example", 30, 31),
  /HTTPS/,
);

const route = readFileSync("src/app/api/geocode/reverse/route.ts", "utf8");
const limiter = readFileSync("src/features/geocoding/services/rate-limit.ts", "utf8");
const env = readFileSync("src/lib/env.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const home = readFileSync("src/features/home/components/home-interactive.tsx", "utf8");
const prayer = readFileSync("src/features/prayer/components/prayer-times-page.tsx", "utf8");
const attribution = readFileSync("src/components/location/openstreetmap-attribution.tsx", "utf8");

assert.match(route, /consumeReverseGeocodeClientRateLimit/);
assert.match(route, /getTrustedClientAddress/);
assert.match(route, /consumeNominatimGlobalRateLimit/);
assert.match(route, /unstable_cache/);
assert.match(route, /revalidate: 86400/);
assert.match(route, /Number\(lat\.toFixed\(4\)\)/);
assert.match(route, /Number\(lon\.toFixed\(4\)\)/);
assert.match(limiter, /public_reverse_geocode_client/);
assert.match(limiter, /public_reverse_geocode_global/);
assert.match(limiter, /p_limit: limit/);
assert.match(limiter, /p_window_seconds: windowSeconds/);
assert.match(limiter, /GLOBAL_LIMIT = 1/);
assert.match(limiter, /GLOBAL_WINDOW_SECONDS = 1/);
assert.match(env, /NOMINATIM_BASE_URL/);
assert.match(envExample, /NOMINATIM_BASE_URL=https:\/\/nominatim\.openstreetmap\.org/);
assert.match(home, /OpenStreetMapAttribution/);
assert.match(prayer, /OpenStreetMapAttribution/);
assert.match(attribution, /openstreetmap\.org\/copyright/);
assert.match(attribution, /OpenStreetMap contributors/);

console.log("Nominatim application-wide rate limit, cache, switchable endpoint, and attribution contracts passed.");
