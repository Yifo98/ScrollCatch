import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, root), "utf8");
}

test("public project identity points to the ScrollCatch repository", async () => {
  const [manifestSource, englishLocaleSource, chineseLocaleSource, readme, privacy, releaseScript] = await Promise.all([
    read("manifest.json"),
    read("_locales/en/messages.json"),
    read("_locales/zh_CN/messages.json"),
    read("README.md"),
    read("PRIVACY.md"),
    read("scripts/package-release.sh")
  ]);
  const manifest = JSON.parse(manifestSource);
  const englishLocale = JSON.parse(englishLocaleSource);
  const chineseLocale = JSON.parse(chineseLocaleSource);

  assert.equal(manifest.version, "1.2.1");
  assert.equal(manifest.homepage_url, "https://github.com/Yifo98/ScrollCatch");
  assert.equal(englishLocale.extensionName.message, "ScrollCatch · 收");
  assert.equal(chineseLocale.extensionName.message, "ScrollCatch · 收");
  assert.match(readme, /github\.com\/Yifo98\/ScrollCatch/);
  assert.match(readme, /^# ScrollCatch · 收$/m);
  assert.match(privacy, /^# ScrollCatch · 收 Privacy Policy$/m);
  assert.match(privacy, /github\.com\/Yifo98\/ScrollCatch\/issues/);
  assert.doesNotMatch(readme, /ScrollCatch — Full Page Capture/);
  assert.doesNotMatch(privacy, /ScrollCatch — Full Page Capture/);
  assert.doesNotMatch(readme, /XF[- ]FullPage[- ]Capture|XF FullPage Capture/);
  assert.doesNotMatch(privacy, /XF[- ]FullPage[- ]Capture|XF FullPage Capture/);
  assert.match(releaseScript, /release_name="ScrollCatch-\$\{version\}"/);
});

test("current store copy uses the ScrollCatch product identity", async () => {
  const currentListing = await read("outputs/chrome-webstore-description-1.2.1.md");

  assert.match(currentListing, /ScrollCatch · 收/);
  assert.doesNotMatch(currentListing, /ScrollCatch — Full Page Capture/);
  assert.doesNotMatch(currentListing, /XF[- ]FullPage[- ]Capture|XF FullPage Capture/);
  assert.match(currentListing, /github\.com\/Yifo98\/ScrollCatch/);
});
