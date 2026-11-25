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
const migration = readFileSync("supabase/migrations/20261116210000_nominatim_global_min_interval.sql", "utf8");
const integration = readFileSync("scripts/tests/nominatim-global-rate-limit.integration.sh", "utf8");
const integrationSql = readFileSync("scripts/tests/nominatim-global-rate-limit.integration.sql", "utf8");
const integrationSetup = readFileSync("scripts/tests/nominatim-global-rate-limit.integration-setup.sql", "utf8");
const qualityGate = readFileSync(".github/workflows/quality-gate.yml", "utf8");
const supabaseTypes = readFileSync("src/lib/types/supabase.ts", "utf8");

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
assert.match(limiter, /GLOBAL_INTERVAL_MS = 1000/);
assert.match(limiter, /consume_min_interval_rate_limit/);
assert.match(supabaseTypes, /consume_min_interval_rate_limit/);
assert.match(migration, /pg_advisory_xact_lock\(hashtext\(p_actor::text\), hashtext\(p_bucket\)\)/);
assert.match(migration, /clock_timestamp\(\)/);
assert.match(migration, /window_started_at = v_slot/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.consume_min_interval_rate_limit[\s\S]*FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.consume_min_interval_rate_limit[\s\S]*TO service_role/);
assert.match(integration, /nominatim-global-rate-limit\.integration-setup\.sql/);
assert.match(integration, /nominatim-global-rate-limit\.integration\.sql/);
assert.match(integrationSql, /pg_sleep\(1\.05\)/);
assert.match(integrationSql, /has_function_privilege\([\s\S]*service_role/);
assert.match(integrationSetup, /CREATE ROLE anon NOLOGIN/);
assert.match(integrationSetup, /CREATE ROLE authenticated NOLOGIN/);
assert.match(integrationSetup, /CREATE ROLE service_role NOLOGIN/);
assert.match(qualityGate, /Verify Nominatim global minimum request interval against PostgreSQL 17/);
assert.match(env, /NOMINATIM_BASE_URL/);
assert.match(envExample, /NOMINATIM_BASE_URL=https:\/\/nominatim\.openstreetmap\.org/);
assert.match(home, /OpenStreetMapAttribution/);
assert.match(prayer, /OpenStreetMapAttribution/);
assert.match(attribution, /openstreetmap\.org\/copyright/);
assert.match(attribution, /OpenStreetMap contributors/);

console.log("Nominatim application-wide rate limit, cache, switchable endpoint, and attribution contracts passed.");
