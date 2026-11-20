import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const exists = (path) => existsSync(resolve(root, path));

const capacitor = JSON.parse(read("capacitor.config.json"));
assert.equal(
  capacitor.plugins?.SplashScreen?.androidSplashResourceName,
  "zikr_splash",
  "Android must use the dedicated ZIKR splash resource rather than the legacy Capacitor splash variants",
);
assert.equal(
  capacitor.plugins?.SplashScreen?.backgroundColor,
  "#061322",
  "Android splash background must match the ZIKR launcher palette",
);

const androidSplashPath = "android/app/src/main/res/drawable/zikr_splash.xml";
assert.ok(exists(androidSplashPath), "the configured Android splash drawable must exist");
const androidSplash = read(androidSplashPath);
assert.match(androidSplash, /@color\/ic_launcher_background/);
assert.match(androidSplash, /@drawable\/ic_launcher_foreground/);

const androidRes = resolve(root, "android/app/src/main/res");
const legacySplashVariants = readdirSync(androidRes)
  .filter((directory) => /^drawable-(?:land|port)-/.test(directory))
  .flatMap((directory) => {
    const path = join(androidRes, directory, "splash.png");
    return existsSync(path) ? [path] : [];
  });
assert.ok(
  legacySplashVariants.length > 0,
  "legacy splash assets are intentionally retained; the configured resource name must avoid selecting them",
);

const splashAssetDirectory = "ios/App/App/Assets.xcassets/Splash.imageset";
const splashContents = JSON.parse(read(join(splashAssetDirectory, "Contents.json")));
assert.deepEqual(
  splashContents.images.map((image) => image.filename),
  ["zikr-splash.png"],
  "the iOS launch image set must reference the branded ZIKR splash image only",
);
const splashImagePath = join(splashAssetDirectory, "zikr-splash.png");
const appIconPath = "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
assert.ok(exists(splashImagePath), "the iOS ZIKR splash image must exist");
assert.deepEqual(
  readFileSync(resolve(root, splashImagePath)),
  readFileSync(resolve(root, appIconPath)),
  "the iOS splash artwork must reuse the existing ZIKR app icon instead of the Capacitor placeholder",
);

const launchScreen = read("ios/App/App/Base.lproj/LaunchScreen.storyboard");
assert.match(launchScreen, /contentMode="scaleAspectFit"/);
assert.match(launchScreen, /image="Splash"/);
assert.match(launchScreen, /<image name="Splash" width="1024" height="1024"\/>/);
assert.match(
  launchScreen,
  /red="0\.023529" green="0\.07451" blue="0\.133333"/,
  "the iOS launch screen must use the ZIKR navy background",
);

console.log("Native Android/iOS splash branding contract passed.");
