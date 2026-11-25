import assert from "node:assert/strict";
import { isInAppUserAgent } from "../../src/lib/native-app";

assert.equal(isInAppUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36"), true);
assert.equal(isInAppUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"), false);
assert.equal(isInAppUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36"), false);
assert.equal(isInAppUserAgent(null), false);
assert.equal(isInAppUserAgent(""), false);
console.log("native-app tests passed");
