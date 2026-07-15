import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";


const root = new URL("../", import.meta.url);

async function read(path) {
  return fs.readFile(new URL(path, root), "utf8");
}

async function loadWorkbenchUtils() {
  const source = await read("result/workbench-utils.js");
  const context = vm.createContext({ globalThis: null });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: "result/workbench-utils.js" });
  return context.XFWorkbenchUtils;
}


test("a dragged last page break can reach the bottom of the final page", async () => {
  const utils = await loadWorkbenchUtils();

  assert.equal(
    utils.clampDraggedPageCut([0.2, 0.4, 0.6], 2, 1),
    0.998
  );
});


test("dragging a page break at the viewport edge auto-scrolls the preview", async () => {
  const utils = await loadWorkbenchUtils();

  assert.equal(utils.getPageDragAutoScrollVelocity(500, 100, 900), 0);
  assert.ok(utils.getPageDragAutoScrollVelocity(888, 100, 900) > 0);
  assert.ok(utils.getPageDragAutoScrollVelocity(112, 100, 900) < 0);
});


test("enabling free crop keeps full-image bounds and applies the mode to every section", async () => {
  const utils = await loadWorkbenchUtils();
  const sections = [
    { state: { enableCrop: false, crop: { x: 0, y: 0, width: 1200, height: 8000 } } },
    { state: { enableCrop: false, crop: { x: 0, y: 0, width: 900, height: 5000 } } }
  ];

  utils.applyCropEnabledToSections(sections, true, (section) => section.state.crop);

  assert.deepEqual(
    sections.map((section) => ({ enabled: section.state.enableCrop, crop: section.state.crop })),
    [
      { enabled: true, crop: { x: 0, y: 0, width: 1200, height: 8000 } },
      { enabled: true, crop: { x: 0, y: 0, width: 900, height: 5000 } }
    ]
  );
});


test("section ordering moves the active segment without losing the remaining composition", async () => {
  const utils = await loadWorkbenchUtils();
  const sections = [{ id: "first" }, { id: "second" }, { id: "third" }];

  assert.deepEqual(
    JSON.parse(JSON.stringify(utils.reorderItemsById(sections, "second", -1))),
    [{ id: "second" }, { id: "first" }, { id: "third" }]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(utils.reorderItemsById(sections, "first", -1))),
    sections
  );
});


test("the workbench opens with custom pagination ready and explains its shortcuts", async () => {
  const [html, source, quickResultSource] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.js"),
    read("result/result.js")
  ]);

  assert.match(html, /<body[^>]*data-default-tool="pagination"/);
  assert.match(html, /id="customPagination"[^>]*checked/);
  assert.match(source, /customPagination:\s*true/);
  assert.match(source, /typeof savedState\.customPagination === "boolean"/);
  assert.match(
    quickResultSource,
    /if \(!hasProtectableEditorWork\(\)\) \{[\s\S]*?localStorage\.removeItem\(editorStateKey\(\)\);[\s\S]*?return;/
  );
  assert.match(html, /<kbd>A<\/kbd>/);
  assert.match(html, /<kbd>Delete<\/kbd>/);
});


test("the workbench removes redundant actions and keeps one top export action", async () => {
  const html = await read("result/merge.html");

  assert.doesNotMatch(html, /id="excludeActiveSection"/);
  assert.doesNotMatch(html, />预览设置</);
  assert.doesNotMatch(html, /id="exportPdf"/);
  assert.equal((html.match(/id="openExportMode"/g) || []).length, 1);
  assert.match(html, /id="cropVisible"/);
  assert.match(html, /id="openPrecisionPanel"/);
  assert.doesNotMatch(html, /class="[^"]*paginate-details/);
  assert.doesNotMatch(html, /id="pageRangeMode"/);
  assert.doesNotMatch(html, />分页设置</);
});


test("crop actions use simple copy, start enabled, and offer an explicit full-image reset", async () => {
  const [html, source] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.js")
  ]);

  assert.match(html, /id="cropFull"/);
  assert.match(html, />恢复全图</);
  assert.match(html, /id="cropVisible"[\s\S]*?>只留当前画面</);
  assert.match(html, /仅保留预览区此刻看到的部分/);
  assert.match(html, /id="enableCrop"[^>]*checked/);
  assert.match(html, /id="cropSummary"/);
  assert.match(source, /elements\.cropFull\.addEventListener\("click"/);
  assert.match(source, /section\.state\.crop = fullPreviewCrop\(section\)/);
});


test("top-toolbar settings open below their controls and precision values stay attached to crop", async () => {
  const [html, css, source] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.css"),
    read("result/merge.js")
  ]);
  const cropGroup = html.slice(
    html.indexOf('data-tool-group="crop"'),
    html.indexOf('data-tool-group="pagination"')
  );

  assert.match(cropGroup, /id="precisionPanel"/);
  assert.match(html, /id="openPrecisionPanel"[^>]*aria-controls="precisionPanel"[^>]*aria-expanded="false"/);
  assert.match(css, /\.dock-more\[open\]\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.tool-group \.dock-popover\s*\{[^}]*top:\s*calc\(100% \+ 8px\)[^}]*bottom:\s*auto/s);
  assert.match(css, /\.tool-group\[data-tool-group="crop"\]\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.precision-panel\s*\{[^}]*top:\s*calc\(100% \+ 8px\)[^}]*left:\s*0[^}]*right:\s*auto/s);
  assert.match(source, /function openPrecisionTrim\(\) \{[\s\S]*?renderActiveControls\(\)/);
  assert.match(source, /elements\.openPrecisionPanel\.setAttribute\("aria-expanded", "true"\)/);
});


test("export settings stay compact while cache management remains visible in the section rail", async () => {
  const html = await read("result/merge.html");
  const source = await read("result/merge.js");
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] || "";
  const tools = html.match(/<div id="coreTools"[\s\S]*?<\/div>\s*<\/section>/)?.[0] || "";
  const rail = html.match(/<aside id="sectionRail"[\s\S]*?<\/aside>/)?.[0] || "";
  const refreshPicker = source.match(/async function refreshCapturePicker\([\s\S]*?\n}/)?.[0] || "";

  assert.match(header, /id="exportSettings"/);
  assert.match(header, />导出设置</);
  assert.doesNotMatch(header, /id="cacheRetentionNote"/);
  assert.match(rail, /class="rail-cache-card"/);
  assert.match(rail, /id="cacheRetentionNote"/);
  assert.match(rail, /id="refreshCacheUsage"/);
  assert.match(rail, /id="deleteOtherCaptureCaches"/);
  assert.match(refreshPicker, /renderCapturePicker\(\);[\s\S]*?await refreshCacheUsage\(\)/);
  assert.doesNotMatch(html, />更多导出与缓存</);
  assert.doesNotMatch(tools, /id="paper"/);
});


test("syncing all sections regenerates page breaks for each target geometry", async () => {
  const [source, utils] = await Promise.all([
    read("result/merge.js"),
    loadWorkbenchUtils()
  ]);
  const syncCopy = source.match(/function copyStateBetweenSections\([\s\S]*?\n}/)?.[0] || "";
  const seedCuts = source.match(/function seedPageCutFractions\([\s\S]*?\n}/)?.[0] || "";

  assert.match(syncCopy, /sourceState\.customPagination\s*\?\s*seedPageCutFractions\(target,\s*targetState\)\s*:\s*\[\]/);
  assert.match(syncCopy, /manualCutMode:\s*"auto"/);
  assert.doesNotMatch(syncCopy, /\[\.\.\.sourceState\.manualCutFractions\]/);
  assert.match(seedCuts, /getSectionExportState\(section, state\)/);
  assert.match(seedCuts, /getPageLayoutPx\(exportState\.outputWidth\)\.contentHeight/);

  const narrowTarget = JSON.parse(JSON.stringify(utils.buildRegularPageCutFractions(3000, 1100)));
  const wideTarget = JSON.parse(JSON.stringify(utils.buildRegularPageCutFractions(3000, 1650)));
  assert.notDeepEqual(narrowTarget, wideTarget);
  assert.deepEqual(narrowTarget, [1100 / 3000, 2200 / 3000]);
  assert.deepEqual(wideTarget, [1650 / 3000]);
});


test("the workbench explains that lightweight preview softness does not affect export", async () => {
  const [html, css] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.css")
  ]);

  assert.match(html, /class="preview-quality-note"/);
  assert.match(html, /预览模糊属正常/);
  assert.match(html, /导出仍使用原始截图/);
  assert.match(css, /\.preview-quality-note\s*\{/);
});


test("quick results use a focused static primary CTA without a looping flourish", async () => {
  const [html, css] = await Promise.all([
    read("result/result.html"),
    read("result/result.css")
  ]);

  assert.match(html, /class="[^"]*workbench-cta[^"]*"/);
  assert.match(html, /class="workbench-cta-button-shell"/);
  assert.doesNotMatch(html, /workbench-cta-orbit/);
  assert.match(html, /进入编辑工作台/);
  assert.match(html, /自定义分页/);
  assert.doesNotMatch(css, /workbench-cta-nudge/);
  assert.doesNotMatch(css, /conic-gradient/);
  assert.match(css, /\.workbench-cta-button-shell\s*\{[^}]*border:\s*1px solid rgba\(11, 92, 255, 0\.2\)[^}]*box-shadow:/s);
});


test("workbench layout prevents section and toolbar text from overflowing", async () => {
  const [css, i18n] = await Promise.all([
    read("result/merge.css"),
    read("shared/i18n.js")
  ]);

  assert.match(css, /\.section-rail\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.active-section-select select\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*text-overflow:\s*ellipsis/s);
  assert.match(css, /\.section-list-item p\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.core-tools\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.2fr\)\s*minmax\(0,\s*1fr\)\s*minmax\(250px,\s*0\.75fr\)/s);
  assert.match(css, /\.rail-actions button\s*\{[^}]*padding-inline:\s*6px[^}]*font-size:\s*12px[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.rail-cache-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.rail-cache-actions button,[\s\S]*?\.rail-cache-actions #deleteOtherCaptureCaches\s*\{[^}]*grid-column:\s*1[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.header-actions \.locale-control\s*\{[^}]*display:\s*flex[^}]*min-height:\s*42px/s);
  assert.match(css, /\.header-actions \.locale-control select\s*\{[^}]*min-width:\s*82px[^}]*border:\s*0/s);
  assert.match(i18n, /"上移当前段":\s*"Move up"/);
  assert.match(i18n, /"下移当前段":\s*"Move down"/);
  assert.match(i18n, /"界面语言":\s*"Language"/);
});


test("the compact toolbar keeps status beside headings instead of creating extra rows", async () => {
  const [html, css] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.css")
  ]);
  const cropHeading = html.match(/<div class="tool-group-heading">[\s\S]*?id="cropSummary"[\s\S]*?<\/div>/)?.[0] || "";
  const paginationHeading = html.match(/<div class="tool-group-heading">[\s\S]*?id="pageRiskInfo"[\s\S]*?id="pageCutList"[\s\S]*?<\/div>/)?.[0] || "";

  assert.match(cropHeading, /class="tool-group-copy"/);
  assert.match(cropHeading, /class="crop-summary tool-inline-status"/);
  assert.match(paginationHeading, /class="tool-inline-status-group"/);
  assert.match(css, /\.core-tools\s*\{[^}]*min-height:\s*86px/s);
  assert.match(css, /\.tool-group \.shortcut-card\s*\{[^}]*flex:\s*0 1 auto/s);
  assert.match(css, /\.export-panel \.check-row\s*\{[^}]*flex:\s*0 1 auto/s);
});


test("export completion offers a clear return path after cache cleanup", async () => {
  const [html, source] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.js")
  ]);

  assert.match(html, /id="exportCompletePanel"/);
  assert.match(html, /id="returnToSourceAfterExport"/);
  assert.match(html, /id="backToResultAfterExport"/);
  assert.match(html, /id="closeAfterExport"/);
  assert.match(source, /elements\.backToResultAfterExport\.hidden = true/);
  assert.match(source, /sourceAvailable \? elements\.returnToSourceAfterExport : elements\.closeAfterExport/);
  assert.match(source, /if \(!elements\.exportCompletePanel\.hidden\) \{\s*showExportCompletePanel\(\)/s);
});


test("multi-section export and completion use unambiguous merged-PDF copy", async () => {
  const [html, css, source] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.css"),
    read("result/merge.js")
  ]);

  assert.match(source, /sections\.length > 1 \? "合并导出 PDF" : "导出 PDF"/);
  assert.match(source, /exportCompleteTitle\.textContent = t\(sections\.length > 1 \? "合并 PDF 已保存" : "PDF 已保存"\)/);
  assert.match(css, /\.export-complete-actions\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(html, /id="exportCompleteTitle">PDF 已保存<\/h2>/);
});


test("section labels follow the visible composition order and sorting controls are explicit", async () => {
  const [html, source] = await Promise.all([
    read("result/merge.html"),
    read("result/merge.js")
  ]);

  assert.match(source, /badge\.textContent = t\(`第 \$\{index \+ 1\} 段`\)/);
  assert.match(source, /sectionMetaText\(section, index\)/);
  assert.doesNotMatch(source, /section\.capture\.segment\?\.part \? `第 \$\{section\.capture\.segment\.part\} 段`/);
  assert.match(html, /id="moveUp"[^>]*>上移当前段<\/button>/);
  assert.match(html, /id="moveDown"[^>]*>下移当前段<\/button>/);
  assert.match(html, /id="openCaptureManager"[\s\S]*?管理与排序[\s\S]*?添加截图、调整组合顺序/);
});


test("cache cleanup copy distinguishes the current export from retained history", async () => {
  const html = await read("result/merge.html");

  assert.match(html, /导出后清理本次组合缓存/);
  assert.match(html, /只清理本次导出的分段/);
  assert.match(html, /其他历史截图仍会保留/);
});


test("the export completion dialog stays hidden until an export actually finishes", async () => {
  const css = await read("result/merge.css");

  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});
