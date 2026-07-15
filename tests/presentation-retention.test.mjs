import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";


async function read(path) {
  return fs.readFile(new URL(path, import.meta.url), "utf8");
}


test("Feishu and presentation capture paths remain wired end to end", async () => {
  const [background, captureTarget, popup, result, merge] = await Promise.all([
    read("../background.js"),
    read("../content/capture-target.js"),
    read("../popup/popup.js"),
    read("../result/result.js"),
    read("../result/merge.js")
  ]);

  assert.match(captureTarget, /function choosePresentationCaptureTarget/);
  assert.match(captureTarget, /function isEmbeddedDocxAttachmentPreviewContext/);
  assert.match(captureTarget, /function capturePresentationPageImage/);
  assert.match(captureTarget, /captureStrategy:\s*"pages"/);
  assert.match(background, /prepared\.target\.captureStrategy === "pages"/);
  assert.match(background, /moved\.captureSource === "page-canvas"/);
  assert.match(popup, /检测到飞书页面/);
  assert.match(result, /captureStrategy === "pages"/);
  assert.match(merge, /captureStrategy === "pages"/);
});
