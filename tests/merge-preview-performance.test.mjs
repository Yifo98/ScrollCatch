import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";


class FakeClassList {
  #values = new Set();

  add(...values) {
    values.forEach((value) => this.#values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.#values.delete(value));
  }

  toggle(value, force) {
    if (force === true) {
      this.#values.add(value);
      return true;
    }
    if (force === false) {
      this.#values.delete(value);
      return false;
    }
    if (this.#values.has(value)) {
      this.#values.delete(value);
      return false;
    }
    this.#values.add(value);
    return true;
  }

  contains(value) {
    return this.#values.has(value);
  }
}


class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.clientWidth = 800;
    this.clientHeight = 600;
    this.scrollTop = 0;
  }

  addEventListener() {}

  setAttribute(name, value) {
    this[name] = String(value);
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  remove() {}

  click() {}

  contains() {
    return true;
  }

  closest() {
    return null;
  }

  scrollIntoView() {}

  setPointerCapture() {}

  releasePointerCapture() {}

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      right: this.clientWidth,
      bottom: this.clientHeight,
      width: this.clientWidth,
      height: this.clientHeight
    };
  }
}


class FakeCanvas extends FakeElement {
  constructor(metrics) {
    super("canvas");
    this.metrics = metrics;
    this._width = 0;
    this._height = 0;
  }

  set width(value) {
    this._width = Number(value) || 0;
  }

  get width() {
    return this._width;
  }

  set height(value) {
    this._height = Number(value) || 0;
  }

  get height() {
    return this._height;
  }

  getContext() {
    return {
      fillStyle: "#ffffff",
      fillRect() {},
      clearRect() {},
      drawImage: () => {
        this.metrics.drawImageCalls += 1;
      },
      save() {},
      restore() {},
      translate() {},
      scale() {},
      beginPath() {},
      rect() {},
      clip() {},
      fillText() {},
      measureText: () => ({ width: 0 })
    };
  }

  toBlob(callback, type = "image/png") {
    callback(new Blob([], { type }));
  }

  toDataURL(type = "image/jpeg") {
    return `data:${type};base64,AA==`;
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      right: this.width,
      bottom: this.height,
      width: this.width,
      height: this.height
    };
  }
}


class FakeImage {
  constructor() {
    this.naturalWidth = 1200;
    this.naturalHeight = 20_000;
    this.onload = null;
    this.onerror = null;
  }

  set src(_value) {
    queueMicrotask(() => this.onload?.());
  }
}


function captureMeta(id, sectionIndex) {
  return {
    id,
    capturedAt: "2026-07-14T00:00:00.000Z",
    source: { title: `Synthetic section ${sectionIndex + 1}` },
    segment: { part: sectionIndex + 1 },
    target: { visibleWidth: 1200, totalHeight: 20_000 },
    slices: [{ index: 0 }]
  };
}


function captureSlice(_index) {
  return {
    dataUrl: "data:image/png;base64,AA==",
    viewport: { width: 1200, height: 20_000 },
    cropRect: { x: 0, y: 0, width: 1200, height: 20_000 },
    targetVisibleHeight: 20_000,
    scrollTop: 0
  };
}


async function runMergePage(sectionCount = 2, savedStates = {}) {
  const metrics = { canvases: [], drawImageCalls: 0 };
  const ids = Array.from({ length: sectionCount }, (_, index) => `section-${index + 1}`);
  const elements = new Map();

  const document = {
    body: new FakeElement("body"),
    addEventListener() {},
    createDocumentFragment: () => new FakeElement("fragment"),
    createElement(tagName) {
      if (tagName === "canvas") {
        const canvas = new FakeCanvas(metrics);
        metrics.canvases.push(canvas);
        return canvas;
      }
      return new FakeElement(tagName);
    },
    querySelector(selector) {
      if (!elements.has(selector)) {
        const element = new FakeElement();
        if (selector === "#previewZoom") element.value = "0.5";
        if (selector === "#previewLayout") element.value = "double";
        if (selector === "#paper") element.value = "a4";
        if (selector === "#orientation") element.value = "portrait";
        if (selector === "#pageRangeMode") element.value = "all";
        if (selector === "#exportScale") element.value = "1";
        if (selector === "#includeMeta") element.checked = true;
        if (selector === "#loadingOverlay") element.hidden = true;
        elements.set(selector, element);
      }
      return elements.get(selector);
    }
  };

  const [source, workbenchUtilsSource] = await Promise.all([
    fs.readFile(new URL("../result/merge.js", import.meta.url), "utf8"),
    fs.readFile(new URL("../result/workbench-utils.js", import.meta.url), "utf8")
  ]);
  const instrumented = source.replace(
    "Promise.resolve(globalThis.XFI18n?.ready?.())",
    "globalThis.__mergeInitPromise = Promise.resolve(globalThis.XFI18n?.ready?.())"
  );

  const context = vm.createContext({
    Blob,
    DataView,
    Date,
    Image: FakeImage,
    Math,
    TextEncoder,
    Uint8Array,
    URL,
    URLSearchParams,
    atob,
    btoa,
    chrome: {
      runtime: {
        getURL: (path) => `chrome-extension://test/${path}`,
        async sendMessage(message) {
          if (message.type === "GET_CAPTURE_META") {
            const index = ids.indexOf(message.captureId);
            return { ok: true, payload: captureMeta(message.captureId, index) };
          }
          if (message.type === "GET_CAPTURE_SLICE") {
            return { ok: true, slice: captureSlice(message.index) };
          }
          if (message.type === "FORGET_CAPTURE") {
            return { ok: true };
          }
          if (message.type === "LIST_CAPTURES") {
            return {
              ok: true,
              captures: ids.map((id, index) => ({
                id,
                title: `Synthetic section ${index + 1}`,
                capturedAt: "2026-07-14T00:00:00.000Z",
                captureStrategy: "scroll",
                sliceCount: 1
              }))
            };
          }
          throw new Error(`Unexpected message: ${message.type}`);
        }
      },
      storage: { local: { get: async () => ({}) } }
    },
    console,
    document,
    globalThis: null,
    localStorage: {
      getItem(key) {
        const id = String(key).split(":").at(-1);
        return savedStates[id] ? JSON.stringify(savedStates[id]) : null;
      },
      removeItem() {},
      setItem() {}
    },
    location: { search: `?ids=${ids.join(",")}&from=${ids[0]}`, href: "" },
    navigator: {},
    performance,
    queueMicrotask,
    requestAnimationFrame: (callback) => callback(),
    setTimeout,
    clearTimeout,
    structuredClone,
    window: { confirm: () => true }
  });
  context.globalThis = context;
  context.window = { ...context.window, document, location: context.location };

  vm.runInContext(workbenchUtilsSource, context, { filename: "result/workbench-utils.js" });
  vm.runInContext(instrumented, context, { filename: "result/merge.js" });
  await context.__mergeInitPromise;

  const snapshot = () => {
    return {
      allocatedCanvasCount: vm.runInContext(
        "sections.filter((section) => section.canvas?.width > 0 && section.canvas?.height > 0).length",
        context
      ),
      allocatedPixels: vm.runInContext(
        "sections.reduce((sum, section) => sum + (section.canvas?.width || 0) * (section.canvas?.height || 0), 0)",
        context
      ),
      drawImageCalls: metrics.drawImageCalls,
      thumbnailSectionCount: vm.runInContext(
        "sections.filter((section) => section.previewStatus === 'thumbnail' && section.previewThumbnail?.width > 0).length",
        context
      ),
      thumbnailPixels: vm.runInContext(
        "sections.reduce((sum, section) => sum + (section.previewThumbnail?.width || 0) * (section.previewThumbnail?.height || 0), 0)",
        context
      )
    };
  };

  return {
    ...snapshot(),
    async switchTo(id) {
      context.__targetSectionId = id;
      await vm.runInContext("setActiveSection(__targetSectionId)", context);
      return snapshot();
    },
    async prepareExports() {
      const prepared = await vm.runInContext("prepareSectionExports()", context);
      return {
        ...snapshot(),
        sectionCount: prepared.prepared.length,
        totalPages: prepared.totalPages,
        manualCutFractions: vm.runInContext(
          "sections.map((section) => [...(section.state?.manualCutFractions || [])])",
          context
        )
      };
    },
    setPaper(value) {
      context.__paperValue = value;
      vm.runInContext("elements.paper.value = __paperValue", context);
    },
    setOrientation(value) {
      context.__orientationValue = value;
      vm.runInContext("elements.orientation.value = __orientationValue", context);
    },
    paperExportSnapshot(sourceWidth = 1200) {
      context.__sourceWidth = sourceWidth;
      const snapshot = vm.runInContext(`(() => {
        const pageSize = getPageSize();
        const layout = getPageLayoutPx(__sourceWidth);
        const canvas = document.createElement("canvas");
        canvas.width = __sourceWidth;
        canvas.height = layout.contentHeight;
        const pdf = new SimplePdf();
        addCanvasPageToPdf(pdf, canvas, __sourceWidth);
        return {
          pageSize: { width: pageSize.width, height: pageSize.height },
          contentHeight: layout.contentHeight,
          pdfBytes: Array.from(pdf.build())
        };
      })()`, context);
      return {
        pageSize: {
          width: Number(snapshot.pageSize.width),
          height: Number(snapshot.pageSize.height)
        },
        contentHeight: snapshot.contentHeight,
        pdfText: Buffer.from(snapshot.pdfBytes).toString("latin1")
      };
    },
    async switchRapidly(...targetIds) {
      const requests = targetIds.map((id) => {
        context.__targetSectionId = id;
        return vm.runInContext("setActiveSection(__targetSectionId)", context);
      });
      await Promise.all(requests);
      return {
        ...snapshot(),
        activeSectionId: vm.runInContext("activeSectionId", context)
      };
    }
  };
}


test("merge workbench keeps only the active section in a composed preview canvas", async () => {
  const result = await runMergePage(2);

  assert.equal(
    result.allocatedCanvasCount,
    1,
    `expected one composed preview canvas, got ${result.allocatedCanvasCount}; ${JSON.stringify(result)}`
  );
  assert.ok(
    result.allocatedPixels <= 30_000_000,
    `expected at most one 24MP section preview, got ${result.allocatedPixels} pixels`
  );

  const afterSwitch = await result.switchTo("section-2");
  assert.equal(
    afterSwitch.allocatedCanvasCount,
    1,
    `expected the previous preview canvas to be released after switching, got ${afterSwitch.allocatedCanvasCount}; ${JSON.stringify(afterSwitch)}`
  );
  assert.ok(
    afterSwitch.allocatedPixels <= 30_000_000,
    `expected the switched workbench to retain at most one 24MP preview, got ${afterSwitch.allocatedPixels} pixels`
  );
  assert.equal(
    afterSwitch.thumbnailSectionCount,
    1,
    `expected the previous section to remain available as a lightweight comparison thumbnail; ${JSON.stringify(afterSwitch)}`
  );
  assert.ok(
    afterSwitch.thumbnailPixels <= 2_000_000,
    `expected thumbnail canvases to remain within the lightweight pixel budget; ${JSON.stringify(afterSwitch)}`
  );
});


test("preparing unvisited sections for export does not compose extra preview canvases", async () => {
  const result = await runMergePage(3);
  const prepared = await result.prepareExports();

  assert.equal(prepared.sectionCount, 3);
  assert.ok(prepared.totalPages >= 3);
  assert.equal(
    prepared.allocatedCanvasCount,
    1,
    `expected export preparation to keep inactive previews lightweight; ${JSON.stringify(prepared)}`
  );
});


test("rapid section switches cancel stale preview work and retain only the latest canvas", async () => {
  const result = await runMergePage(3);
  const repeatedSwitch = await result.switchRapidly("section-2", "section-2");
  assert.equal(repeatedSwitch.activeSectionId, "section-2");
  assert.equal(repeatedSwitch.allocatedCanvasCount, 1);

  const returnToStaleTarget = await result.switchRapidly("section-2", "section-3", "section-2");
  assert.equal(returnToStaleTarget.activeSectionId, "section-2");
  assert.equal(
    returnToStaleTarget.allocatedCanvasCount,
    1,
    `expected a fresh preview when returning to a stale target; ${JSON.stringify(returnToStaleTarget)}`
  );

  const afterSwitches = await result.switchRapidly("section-2", "section-3");

  assert.equal(afterSwitches.activeSectionId, "section-3");
  assert.equal(
    afterSwitches.allocatedCanvasCount,
    1,
    `expected stale preview work to be released; ${JSON.stringify(afterSwitches)}`
  );
});


test("export preparation refreshes automatic cuts for an unvisited saved section", async () => {
  const result = await runMergePage(2, {
    "section-2": {
      version: 1,
      canvas: { width: 1200, height: 20_000 },
      paper: "a4",
      orientation: "portrait",
      includeMeta: true,
      enableCrop: false,
      crop: { x: 0, y: 0, width: 1200, height: 20_000 },
      exportScale: 1,
      customPagination: true,
      manualCutMode: "auto",
      manualCutFractions: [0.35, 0.7]
    }
  });

  result.setPaper("a3");
  const prepared = await result.prepareExports();
  assert.notDeepEqual(prepared.manualCutFractions[1], [0.35, 0.7]);
  assert.ok(prepared.manualCutFractions[1].length > 2);
});


test("paper size and orientation change both workbench pagination and exported PDF MediaBox", async () => {
  const result = await runMergePage(1);

  const a4Portrait = result.paperExportSnapshot();
  assert.deepEqual(a4Portrait.pageSize, { width: 595.28, height: 841.89 });
  assert.match(a4Portrait.pdfText, /\/MediaBox \[0 0 595\.28 841\.89\]/);

  result.setOrientation("landscape");
  const a4Landscape = result.paperExportSnapshot();
  assert.deepEqual(a4Landscape.pageSize, { width: 841.89, height: 595.28 });
  assert.match(a4Landscape.pdfText, /\/MediaBox \[0 0 841\.89 595\.28\]/);
  assert.ok(
    a4Landscape.contentHeight < a4Portrait.contentHeight * 0.55,
    `expected landscape pagination to be visibly shorter: ${JSON.stringify({ a4Portrait, a4Landscape }, ["pageSize", "contentHeight"])}`
  );

  result.setPaper("a3");
  result.setOrientation("portrait");
  const a3Portrait = result.paperExportSnapshot();
  assert.deepEqual(a3Portrait.pageSize, { width: 841.89, height: 1190.55 });
  assert.match(a3Portrait.pdfText, /\/MediaBox \[0 0 841\.89 1190\.55\]/);
  assert.ok(
    Math.abs(a3Portrait.contentHeight - a4Portrait.contentHeight) / a4Portrait.contentHeight < 0.01,
    "expected A-series workbench reference areas to look nearly identical because A3 and A4 share the same aspect ratio"
  );

  result.setPaper("letter");
  const letterPortrait = result.paperExportSnapshot();
  assert.deepEqual(letterPortrait.pageSize, { width: 612, height: 792 });
  assert.match(letterPortrait.pdfText, /\/MediaBox \[0 0 612 792\]/);
  assert.notEqual(letterPortrait.contentHeight, a4Portrait.contentHeight);
});
