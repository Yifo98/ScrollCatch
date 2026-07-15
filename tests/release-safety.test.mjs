import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, root), "utf8");
}

test("the quick-result workbench entry is available before full preview composition", async () => {
  const source = await read("result/result.js");
  const enabledAt = source.indexOf("elements.toggleEditorMode.disabled = false;", source.indexOf("async function init()"));
  const compositionAt = source.indexOf("await composePreview();", source.indexOf("async function init()"));

  assert.ok(enabledAt > -1);
  assert.ok(compositionAt > enabledAt);
});

test("linked quick results reuse the current lightweight canvas instead of composing it twice", async () => {
  const source = await read("result/result.js");
  const init = source.match(/async function init\(\)[\s\S]*?\n}/)?.[0] || "";

  assert.match(init, /if \(quickPreviewPlan\.ids\.length > 1\)[\s\S]*?await composeContinuousQuickPreview\(\);[\s\S]*?else[\s\S]*?await composePreview\(\);/);
  assert.match(source, /if \(id === captureId\)[\s\S]*?compositionInfo = previewInfo/);
  assert.match(source, /catch \(error\)[\s\S]*?if \(id === captureId\)[\s\S]*?await composePreview\(\)/);
});

test("manual cache deletion does not promise exports that need deleted slices", async () => {
  const [resultSource, mergeSource] = await Promise.all([
    read("result/result.js"),
    read("result/merge.js")
  ]);

  assert.match(resultSource, /不能再次高清导出/);
  assert.match(resultSource, /function enforceDeletedCaptureState\(\)/);
  assert.match(mergeSource, /let sectionCachesDeleted = false/);
  assert.match(mergeSource, /sections\.length === 0 \|\| sectionCachesDeleted/);
  assert.match(mergeSource, /if \(!response\?\.ok\)[\s\S]*?Could not delete cached capture/);
  assert.match(mergeSource, /const failures = \[\][\s\S]*?deletedCacheIds\.add\(id\)[\s\S]*?if \(failures\.length\)/);
  assert.match(resultSource, /type: atSavedEnd \? "OPEN_SOURCE_AT_SCROLL" : "OPEN_SOURCE"[\s\S]*?source: capture\?\.source/);
  assert.match(resultSource, /openSourceAtEnd\.disabled = [^;]*hasDeletedCaptureCache/);
});

test("the release script validates every new runtime dependency", async () => {
  const source = await read("scripts/package-release.sh");

  for (const required of [
    "shared/i18n.js",
    "_locales/zh_CN/messages.json",
    "_locales/en/messages.json",
    "result/workflow-utils.js",
    "result/workbench-utils.js"
  ]) {
    assert.ok(source.includes(`\"${required}\"`), required);
  }
});

test("local browser profiles, screenshots, and design QA stay outside source and release packages", async () => {
  const [gitignore, releaseScript] = await Promise.all([
    read(".gitignore"),
    read("scripts/package-release.sh")
  ]);

  assert.match(gitignore, /^output\/$/m);
  assert.match(gitignore, /^outputs\/\*$/m);
  assert.match(gitignore, /^!outputs\/\*\.md$/m);
  assert.match(gitignore, /^design-qa\.md$/m);
  assert.doesNotMatch(releaseScript, /\boutputs?\b/);
  assert.doesNotMatch(releaseScript, /design-qa\.md/);
});

test("background alerts use the selected interface locale", async () => {
  const source = await read("background.js");

  assert.match(source, /^import "\.\/shared\/i18n\.js";/);
  assert.match(source, /backgroundT\("截图未完成：PPT 预览器没有成功跳到目标页。"\)/);
  assert.match(source, /return backgroundT\(`截图失败：\$\{message\}`\);/);
  assert.match(source, /backgroundT\("原文页面已重新打开，但长内容还没有恢复到保存的位置。"\)/);
  assert.match(source, /backgroundT\("原文标签页已关闭，并且无法重新打开该页面。"\)/);
});
