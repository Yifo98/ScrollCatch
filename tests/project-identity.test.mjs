import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, root), "utf8");
}

test("public project identity points to the ScrollCatch repository", async () => {
  const [manifestSource, readme, privacy, releaseScript] = await Promise.all([
    read("manifest.json"),
    read("README.md"),
    read("PRIVACY.md"),
    read("scripts/package-release.sh")
  ]);
  const manifest = JSON.parse(manifestSource);

  assert.equal(manifest.version, "1.2.0");
  assert.equal(manifest.homepage_url, "https://github.com/Yifo98/ScrollCatch");
  assert.match(readme, /github\.com\/Yifo98\/ScrollCatch/);
  assert.match(privacy, /github\.com\/Yifo98\/ScrollCatch\/issues/);
  assert.doesNotMatch(readme, /XF[- ]FullPage[- ]Capture|XF FullPage Capture/);
  assert.doesNotMatch(privacy, /XF[- ]FullPage[- ]Capture|XF FullPage Capture/);
  assert.match(releaseScript, /release_name="ScrollCatch-\$\{version\}"/);
});

test("current store copy uses the ScrollCatch product identity", async () => {
  const currentListing = await read("outputs/chrome-webstore-description-1.2.0.md");

  assert.match(currentListing, /ScrollCatch — Full Page Capture/);
  assert.doesNotMatch(currentListing, /XF[- ]FullPage[- ]Capture|XF FullPage Capture/);
  assert.match(currentListing, /github\.com\/Yifo98\/ScrollCatch/);
});
