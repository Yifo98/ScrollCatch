import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";


class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener));
  }

  dispatch(type, event) {
    for (const listener of [...(this.listeners.get(type) || [])]) {
      listener(event);
    }
  }
}


async function loadCaptureContentScript(options = {}) {
  let source = await fs.readFile(new URL("../content/capture-target.js", import.meta.url), "utf8");
  if (options.exposeTestHelpers) {
    source = source.replace(/\}\)\(\);\s*$/, "globalThis.__captureTargetTest = { getPickedScrollTop };\n})();");
  }
  const sentMessages = [];
  let runtimeListener = null;
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  const document = Object.assign(documentTarget, {
    documentElement: { style: {}, appendChild() {}, scrollTop: 0, scrollHeight: 1000, scrollWidth: 100 },
    body: { style: {} }
  });
  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          runtimeListener = listener;
        },
        removeListener() {}
      },
      sendMessage(message) {
        sentMessages.push(message);
        return Promise.resolve({ ok: true });
      }
    },
    storage: {
      local: { get: options.storageGet || (async () => ({})) },
      onChanged: { addListener() {} }
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    document,
    window: Object.assign(windowTarget, { innerHeight: 100, innerWidth: 100, scrollY: 0 }),
    globalThis: null,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) { callback(); return 1; },
    cancelAnimationFrame() {}
  });
  context.globalThis = context;
  vm.runInContext(source, context, { filename: "content/capture-target.js" });
  assert.equal(typeof runtimeListener, "function");
  return { runtimeListener, sentMessages, windowTarget, document, testHelpers: context.__captureTargetTest };
}


function escapeEvent() {
  return {
    key: "Escape",
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; }
  };
}


function sendRuntimeMessage(listener, message) {
  return new Promise((resolve) => {
    const returned = listener(message, {}, resolve);
    if (returned !== true) {
      resolve(returned);
    }
  });
}


test("any armed page frame can stop the active capture with Escape", async () => {
  const { runtimeListener, sentMessages, windowTarget } = await loadCaptureContentScript();

  const armed = await sendRuntimeMessage(runtimeListener, {
    type: "XF_ARM_CAPTURE_STOP",
    sessionId: "session-top-frame"
  });
  assert.equal(armed?.ok, true);

  const event = escapeEvent();
  windowTarget.dispatch("keydown", event);
  await Promise.resolve();

  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.deepEqual(JSON.parse(JSON.stringify(sentMessages)), [{
    type: "XF_USER_STOP_CAPTURE",
    sessionId: "session-top-frame"
  }]);
});


test("disarming a capture restores the page Escape key", async () => {
  const { runtimeListener, sentMessages, windowTarget } = await loadCaptureContentScript();

  await sendRuntimeMessage(runtimeListener, { type: "XF_ARM_CAPTURE_STOP", sessionId: "session-1" });
  await sendRuntimeMessage(runtimeListener, { type: "XF_DISARM_CAPTURE_STOP", sessionId: "session-1" });
  const event = escapeEvent();
  windowTarget.dispatch("keydown", event);
  await Promise.resolve();

  assert.equal(event.prevented, false);
  assert.equal(event.stopped, false);
  assert.equal(sentMessages.length, 0);
});


test("range picking can be cancelled with Escape from the page window", async () => {
  const source = await fs.readFile(new URL("../content/capture-target.js", import.meta.url), "utf8");
  const picker = source.match(/async function pickCaptureRange\(\)[\s\S]*?\n  function stopPickerEvent/)?.[0] || "";

  assert.match(picker, /window\.addEventListener\("keydown", onKeydown, true\)/);
  assert.match(picker, /window\.removeEventListener\("keydown", onKeydown, true\)/);
  assert.match(picker, /startButton\.focus\(\{ preventScroll: true \}\)/);
  assert.match(picker, /finish\(\{ ok: true, cancelled: true \}\)/);
});


test("range picking shows a live selected-size preview", async () => {
  const source = await fs.readFile(new URL("../content/capture-target.js", import.meta.url), "utf8");
  const picker = source.match(/async function pickCaptureRange\(\)[\s\S]*?\n  function stopPickerEvent/)?.[0] || "";

  assert.match(picker, /selectionBand/);
  assert.match(picker, /selectionSize/);
  assert.match(picker, /updateSelectionPreview/);
  assert.match(picker, /×/);
});


test("range picking can be cancelled while browser focus is still in the popup", async () => {
  const [popupSource, backgroundSource, contentSource] = await Promise.all([
    fs.readFile(new URL("../popup/popup.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../background.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../content/capture-target.js", import.meta.url), "utf8")
  ]);

  assert.match(popupSource, /document\.addEventListener\("keydown", handlePopupKeydown, true\)/);
  assert.match(popupSource, /if \(mode === "range"\)[\s\S]*?activeRangeSessionId = response\.sessionId/);
  assert.match(backgroundSource, /type: "XF_CANCEL_CAPTURE_RANGE"/);
  assert.match(backgroundSource, /if \(controller\.stopRequested\) \{\s*throw new CaptureCancelledError/);
  assert.match(contentSource, /message\?\.type === "XF_CANCEL_CAPTURE_RANGE"[\s\S]*?cancelStartPicker\(\)/);
  assert.match(contentSource, /state\.startPickerCancel/);
});


test("range picking can select an endpoint inside the final viewport", async () => {
  const { testHelpers, windowTarget, document } = await loadCaptureContentScript({ exposeTestHelpers: true });
  windowTarget.scrollY = 900;

  const pickedBottom = testHelpers.getPickedScrollTop({
    element: document.documentElement,
    isWindow: true
  }, 100);

  assert.equal(pickedBottom, 1000);
});


test("an immediate Escape is remembered while the range picker is still opening", async () => {
  let resolveStoredLocale;
  const storageGet = () => new Promise((resolve) => {
    resolveStoredLocale = resolve;
  });
  const { runtimeListener } = await loadCaptureContentScript({ storageGet });

  const picking = sendRuntimeMessage(runtimeListener, { type: "XF_PICK_CAPTURE_RANGE" });
  const cancelled = await sendRuntimeMessage(runtimeListener, { type: "XF_CANCEL_CAPTURE_RANGE" });
  resolveStoredLocale({});

  assert.equal(cancelled?.ok, true);
  const picked = await picking;
  assert.equal(picked?.ok, true);
  assert.equal(picked?.cancelled, true);
});
