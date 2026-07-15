import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";


const root = new URL("../", import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, root), "utf8");
}

async function loadWorkflow() {
  const source = await read("result/workflow-utils.js");
  const context = vm.createContext({ globalThis: null });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: "result/workflow-utils.js" });
  return context.XFResultWorkflow;
}


test("quick results plan a complete lightweight preview for every linked section", async () => {
  const workflow = await loadWorkflow();
  const items = [
    { id: "part-4", capturedAt: "2026-07-14T00:04:00Z", segment: { part: 4, parentCaptureId: "part-3", startScrollTop: 288_000 } },
    { id: "part-2", capturedAt: "2026-07-14T00:02:00Z", segment: { part: 2, parentCaptureId: "part-1", startScrollTop: 96_000 } },
    { id: "unrelated", capturedAt: "2026-07-14T00:00:00Z", segment: { part: 1, startScrollTop: 0 } },
    { id: "part-1", capturedAt: "2026-07-14T00:01:00Z", segment: { part: 1, startScrollTop: 0 } },
    { id: "part-3", capturedAt: "2026-07-14T00:03:00Z", segment: { part: 3, parentCaptureId: "part-2", startScrollTop: 192_000 } }
  ];

  const plan = workflow.getQuickPreviewPlan(items, "part-4", 8_000_000);
  assert.deepEqual([...plan.ids], ["part-1", "part-2", "part-3", "part-4"]);
  assert.equal(plan.pixelBudgetPerSection, 2_000_000);
});


test("partial long-page exports keep the cache needed for continuation and later merging", async () => {
  const workflow = await loadWorkflow();

  assert.equal(workflow.shouldKeepCaptureCacheAfterExport({
    source: { url: "https://example.com/article" },
    segment: { reason: "user-stop", endScrollTop: 4_800, canReturnToSource: true }
  }), true);
  assert.equal(workflow.shouldKeepCaptureCacheAfterExport({
    source: { url: "https://example.com/article" },
    segment: { reason: "complete", endScrollTop: 12_000, canReturnToSource: true }
  }), false);
  assert.equal(workflow.shouldKeepCaptureCacheAfterExport({
    source: { url: "https://example.com/article" },
    segment: { reason: "complete", endScrollTop: 12_000, canReturnToSource: true }
  }, { linkedSectionCount: 3 }), true);
});


test("quick result prioritizes the workbench, then current-section PDF, with images secondary", async () => {
  const html = await read("result/result.html");
  const actions = html.match(/<section class="[^"]*result-actions-panel[^"]*">[\s\S]*?<\/section>/)?.[0] || "";

  const workbenchAt = actions.indexOf('id="toggleEditorMode"');
  const pdfAt = actions.indexOf('id="savePdf"');
  const moreAt = actions.indexOf('<details class="export-options">');
  const pngAt = actions.indexOf('id="savePng"');
  assert.ok(workbenchAt >= 0 && workbenchAt < pdfAt);
  assert.ok(pdfAt < moreAt);
  assert.ok(pngAt > moreAt);
  assert.match(html, /id="continuousPreview"/);
});


test("the workbench exposes only crop, pagination, and export tool groups", async () => {
  const [html, source] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.js")
  ]);

  assert.doesNotMatch(html, /class="workflow-tabs"/);
  assert.doesNotMatch(html, />整理<|>精修</);
  assert.match(html, /data-tool-group="crop"/);
  assert.match(html, /data-tool-group="pagination"/);
  assert.match(html, /data-tool-group="export"/);
  assert.match(html, /id="applyActiveToAll"[^>]*>[\s\S]*?同步应用到全部/);
  assert.doesNotMatch(html, /id="excludeActiveSection"/);
  assert.match(html, /id="syncBeforeExport"[^>]*checked/);
  assert.match(source, /function startNewCropDrag\(/);
  assert.match(source, /type: "crop-new"/);
});


test("cache deletion is selected by default on quick and merged exports", async () => {
  const [resultHtml, mergeHtml] = await Promise.all([
    read("result/result.html"),
    read("result/merge.html")
  ]);

  const quickActions = resultHtml.match(/<section class="[^"]*result-actions-panel[^"]*">[\s\S]*?<\/section>/)?.[0] || "";
  const exportPanel = mergeHtml.match(/<section class="tool-group export-panel"[\s\S]*?<\/section>/)?.[0] || "";
  const visibleExportControls = exportPanel.split('<details class="dock-more export-details">')[0];

  assert.match(resultHtml, /id="autoClearAfterExport"[^>]*checked/);
  assert.match(mergeHtml, /id="autoClearAfterExport"[^>]*checked/);
  assert.match(quickActions, /id="autoClearAfterExport"[^>]*checked/);
  assert.match(visibleExportControls, /id="autoClearAfterExport"[^>]*checked/);
});
