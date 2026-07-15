import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";


async function loadWorkflow() {
  const source = await fs.readFile(new URL("../result/workflow-utils.js", import.meta.url), "utf8");
  const context = vm.createContext({ globalThis: null });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: "result/workflow-utils.js" });
  return context.XFResultWorkflow;
}


test("complete captures keep a return-to-source action without offering a false continuation", async () => {
  const workflow = await loadWorkflow();
  const state = workflow.getSourceActionState({
    source: { tabId: 11, url: "https://example.com/article" },
    segment: {
      part: 1,
      endScrollTop: 20_000,
      nextScrollTop: null,
      reason: "complete",
      canReturnToSource: false
    }
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(state)),
    { show: true, canReturn: true, canReturnToSavedEnd: true, canContinue: false }
  );
});


test("interrupted long captures offer one-click continuation from the saved end position", async () => {
  const workflow = await loadWorkflow();
  const state = workflow.getSourceActionState({
    source: { tabId: 11, url: "https://example.com/article" },
    segment: {
      part: 1,
      endScrollTop: 96_000,
      nextScrollTop: 95_200,
      reason: "segment-limit",
      canReturnToSource: true
    }
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(state)),
    { show: true, canReturn: true, canReturnToSavedEnd: true, canContinue: true }
  );
});


test("old captures without a saved position still keep a working original-article action", async () => {
  const workflow = await loadWorkflow();
  const state = workflow.getSourceActionState({
    source: { url: "https://example.com/article" },
    segment: { reason: "complete" }
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(state)),
    { show: true, canReturn: true, canReturnToSavedEnd: false, canContinue: false }
  );
});


test("the editor automatically groups only explicitly linked continuation captures", async () => {
  const workflow = await loadWorkflow();
  const items = [
    {
      id: "part-2",
      capturedAt: "2026-07-14T00:01:00.000Z",
      url: "https://example.com/article",
      segment: { part: 2, parentCaptureId: "part-1", startScrollTop: 95_200 }
    },
    {
      id: "unrelated-history",
      capturedAt: "2026-07-13T00:00:00.000Z",
      url: "https://example.com/article",
      segment: { part: 1, parentCaptureId: "", startScrollTop: 0 }
    },
    {
      id: "part-1",
      capturedAt: "2026-07-14T00:00:00.000Z",
      url: "https://example.com/article",
      segment: { part: 1, parentCaptureId: "", startScrollTop: 0 }
    }
  ];

  assert.deepEqual(
    [...workflow.getContinuousCaptureIds(items, "part-2")],
    ["part-1", "part-2"]
  );
});


test("presentation captures keep paged image exports in the quick result", async () => {
  const workflow = await loadWorkflow();

  assert.equal(workflow.shouldKeepPagedExportsVisible({ target: { captureStrategy: "pages" } }), true);
  assert.equal(workflow.shouldKeepPagedExportsVisible({ target: { captureStrategy: "scroll" } }), false);
});


test("manual capture selection remains available as a collapsed editor fallback", async () => {
  const html = await fs.readFile(new URL("../result/result.html", import.meta.url), "utf8");

  assert.match(html, /<details id="sectionManagerSection"[^>]*>/);
  assert.doesNotMatch(html, /<details id="sectionManagerSection"[^>]*\shidden(?:\s|>)/);
  assert.match(html, /<summary>添加其他截图<\/summary>/);
  assert.match(html, /id="openMergeEditor"/);
});


test("the multi-section workbench can add or exclude cached captures without opening another workspace", async () => {
  const html = await fs.readFile(new URL("../result/merge.html", import.meta.url), "utf8");

  assert.match(html, /<summary>添加或排除截图<\/summary>/);
  assert.match(html, /id="capturePickerList"/);
  assert.match(html, /id="applyCaptureSelection"/);
});


test("quick results keep the workbench and secondary export formats in the left decision panel", async () => {
  const html = await fs.readFile(new URL("../result/result.html", import.meta.url), "utf8");
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] || "";
  const aside = html.match(/<aside[\s\S]*?<\/aside>/)?.[0] || "";

  assert.doesNotMatch(header, /id="toggleEditorMode"/);
  assert.match(aside, /id="toggleEditorMode"/);
  assert.match(aside, /<summary>更多导出格式<\/summary>/);
  assert.match(aside, /id="segmentProgress"/);
});
