import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, root), "utf8");
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

test("the QIDU brand lockup appears on all three extension surfaces", async () => {
  const pages = await Promise.all([
    read("popup/popup.html"),
    read("result/result.html"),
    read("result/merge.html")
  ]);

  for (const page of pages) {
    assert.match(page, /ScrollCatch · 收/);
    assert.match(page, /收其全貌，存其有度。/);
    assert.match(page, /A QIDU Utility/);
  }
});

test("the toolbar icons are one consistent production mark at every manifest size", async () => {
  for (const size of [16, 32, 48, 128]) {
    const buffer = await fs.readFile(new URL(`icons/icon-${size}.png`, root));
    assert.deepEqual(pngSize(buffer), { width: size, height: size });
  }
});

test("the brand refresh keeps the public identity, English default, and permission boundary", async () => {
  const manifest = JSON.parse(await read("manifest.json"));

  assert.equal(manifest.name, "__MSG_extensionName__");
  assert.equal(manifest.default_locale, "en");
  assert.deepEqual(manifest.permissions, [
    "activeTab",
    "scripting",
    "storage",
    "tabs",
    "unlimitedStorage",
    "webNavigation"
  ]);
  assert.deepEqual(manifest.host_permissions, ["<all_urls>"]);
});

test("English carries the brand signature without renaming QIDU", async () => {
  const source = await read("shared/i18n.js");

  assert.match(source, /"收其全貌，存其有度。": "Capture the whole, preserve with restraint\."/);
  assert.match(source, /"A QIDU Utility": "A QIDU Utility"/);
});
