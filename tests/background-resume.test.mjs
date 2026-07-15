import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";


function capturePayload() {
  return {
    id: "capture-1",
    source: {
      tabId: 41,
      windowId: 4,
      url: "https://example.com/long-article",
      title: "Long article"
    },
    target: {
      frameId: 0,
      mode: "inner-scroll",
      captureProfile: "auto",
      totalHeight: 120_000,
      visibleHeight: 900
    },
    segment: {
      part: 1,
      endScrollTop: 96_000,
      nextScrollTop: 95_200,
      fullTotalHeight: 120_000,
      reason: "segment-limit",
      canReturnToSource: true
    },
    slices: []
  };
}


async function runBackground(options = {}) {
  const payload = capturePayload();
  const createdTabs = [];
  const sentMessages = [];
  const resumeResponses = [...(options.resumeResponses || [])];
  const localStorageState = {};
  let activeTab = null;

  const chrome = {
    action: {
      setBadgeBackgroundColor: async () => {},
      setBadgeText: async () => {}
    },
    commands: { onCommand: { addListener() {} } },
    runtime: {
      lastError: null,
      getURL: (path) => `chrome-extension://test/${path}`,
      onMessage: { addListener() {} }
    },
    scripting: {
      executeScript: async () => []
    },
    storage: {
      local: {
        async get(key) {
          if (key === "capture:capture-1") {
            return options.captureMissing ? {} : { [key]: payload };
          }
          if (key === null) {
            return { ...localStorageState };
          }
          if (Array.isArray(key)) {
            return Object.fromEntries(key.filter((item) => item in localStorageState).map((item) => [item, localStorageState[item]]));
          }
          return key in localStorageState ? { [key]: localStorageState[key] } : {};
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            delete localStorageState[key];
          }
        },
        async set(value) {
          Object.assign(localStorageState, value);
        }
      }
    },
    tabs: {
      async get(tabId) {
        if (tabId === 41) {
          throw new Error("No tab with id: 41");
        }
        return activeTab;
      },
      async create(options) {
        activeTab = { id: 88, windowId: 8, status: "complete", ...options };
        createdTabs.push(options);
        return activeTab;
      },
      async query() {
        return activeTab ? [activeTab] : [];
      },
      async update(tabId, options) {
        activeTab = { ...(activeTab || {}), id: tabId, windowId: 8, ...options };
        return activeTab;
      },
      sendMessage(tabId, message, options, callback) {
        sentMessages.push({ tabId, message, options });
        callback(resumeResponses.length
          ? resumeResponses.shift()
          : { ok: true, scrollTop: message.scrollTop });
      }
    },
    webNavigation: {
      async getAllFrames() {
        return [{ frameId: 0, parentFrameId: -1, url: payload.source.url }];
      }
    },
    windows: { update: async () => {} }
  };

  const i18nSource = await fs.readFile(new URL("../shared/i18n.js", import.meta.url), "utf8");
  const source = await fs.readFile(new URL("../background.js", import.meta.url), "utf8");
  const scriptSource = source
    .replace(/^import\s+"\.\/shared\/i18n\.js";\s*/u, "")
    .replace(
      "startCapture(tab, controller).catch(async (error) => {",
      options.freezeCaptureLaunch
        ? "new Promise(() => {}).catch(async (error) => {"
        : "startCapture(tab, controller).catch(async (error) => {"
    );
  const instrumented = `${scriptSource}\n;globalThis.__backgroundTest = {\n  returnSourceToCaptureScroll,\n  openSourceAtScroll,\n  launchCaptureFromMessage,\n  clearPendingContinuationMemory() { pendingContinuations.clear(); },\n  getRunningCaptureOptions(tabId) { return runningCaptures.get(tabId)?.options || null; },\n  openOriginalSource: typeof openOriginalSource === "function" ? openOriginalSource : null\n};`;
  const context = vm.createContext({
    URL,
    chrome,
    console,
    crypto,
    globalThis: null,
    setTimeout(callback) {
      queueMicrotask(callback);
      return 1;
    },
    clearTimeout() {}
  });
  context.globalThis = context;
  vm.runInContext(i18nSource, context, { filename: "shared/i18n.js" });
  vm.runInContext(instrumented, context, { filename: "background.js" });

  return { context, createdTabs, sentMessages };
}


test("returning to the saved end position reopens a closed source tab", async () => {
  const { context, createdTabs, sentMessages } = await runBackground();
  const result = await context.__backgroundTest.returnSourceToCaptureScroll("capture-1");

  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "https://example.com/long-article");
  assert.equal(result.tab.id, 88);
  assert.equal(result.scrollTop, 96_000);
  assert.equal(sentMessages.at(-1).message.type, "XF_SCROLL_TO_POSITION");
  assert.equal(sentMessages.at(-1).message.scrollTop, 96_000);
});


test("returning to the original article works even when the old tab was closed", async () => {
  const { context, createdTabs } = await runBackground();

  assert.equal(typeof context.__backgroundTest.openOriginalSource, "function");
  const result = await context.__backgroundTest.openOriginalSource("capture-1");

  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "https://example.com/long-article");
  assert.equal(result.tabId, 88);
});


test("returning to the original article still works after its heavy capture cache was deleted", async () => {
  const { context, createdTabs } = await runBackground({ captureMissing: true });
  const result = await context.__backgroundTest.openOriginalSource("capture-1", capturePayload().source);

  assert.equal(createdTabs.length, 1);
  assert.equal(createdTabs[0].url, "https://example.com/long-article");
  assert.equal(result.tabId, 88);
});


test("returning to the saved end retries until lazy content reaches the requested position", async () => {
  const { context, sentMessages } = await runBackground({
    resumeResponses: [
      { ok: true, scrollTop: 0 },
      { ok: true, scrollTop: 42_000 },
      { ok: true, scrollTop: 96_000 }
    ]
  });

  const result = await context.__backgroundTest.returnSourceToCaptureScroll("capture-1");

  assert.equal(result.scrollTop, 96_000);
  assert.equal(sentMessages.length, 3);
});


test("returning to the saved end reports an error when lazy content never becomes ready", async () => {
  const { context, sentMessages } = await runBackground({
    resumeResponses: Array.from({ length: 12 }, () => ({ ok: true, scrollTop: 0 }))
  });

  await assert.rejects(
    context.__backgroundTest.returnSourceToCaptureScroll("capture-1"),
    /long content was not ready at the saved position/
  );
  assert.equal(sentMessages.length, 12);
});


test("returning to the saved end links the next from-current capture to the previous segment", async () => {
  const { context } = await runBackground({ freezeCaptureLaunch: true });

  await context.__backgroundTest.openSourceAtScroll("capture-1");
  context.__backgroundTest.clearPendingContinuationMemory();
  await context.__backgroundTest.launchCaptureFromMessage({
    type: "START_CAPTURE",
    tabId: 88,
    mode: "current"
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.__backgroundTest.getRunningCaptureOptions(88))),
    {
      mode: "current",
      captureProfile: "auto",
      segmentPart: 2,
      parentCaptureId: "capture-1"
    }
  );
});
