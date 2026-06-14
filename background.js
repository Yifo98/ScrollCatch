const captures = new Map();
const runningCaptures = new Map();

let lastVisibleTabCaptureAt = 0;
let visibleTabCaptureQueue = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CAPTURE_INTERVAL_MS = 900;
const CAPTURE_TAB_WAIT_MS = 220;
const CAPTURE_QUOTA_RETRY_MS = 1250;
const MAX_SLICES = 260;
const DEFAULT_SEGMENT_HEIGHT = 96000;
const MIN_SEGMENT_HEIGHT = 2400;
const CAPTURE_INDEX_KEY = "xfCaptureIndex";
const MAX_STORED_CAPTURES = 12;

class CaptureCancelledError extends Error {
  constructor(message) {
    super(message);
    this.name = "CaptureCancelledError";
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "stop-capture") {
    requestAllCaptureStops();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "START_CAPTURE") {
    launchCaptureFromMessage(message).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "OPEN_SOURCE_AT_SCROLL") {
    openSourceAtScroll(message.captureId).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "START_CAPTURE_FROM_SOURCE_SCROLL") {
    startCaptureFromSourceScroll(message.captureId, _sender?.tab?.id).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "STOP_CAPTURE" || message?.type === "XF_USER_STOP_CAPTURE") {
    requestCaptureStop(message.tabId, message.sessionId).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "GET_RUNNING_STATE") {
    getRunningState(message.tabId).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "GET_CAPTURE_META") {
    getCapture(message.captureId).then((payload) => {
      if (!payload) {
        sendResponse({ ok: false, error: "Capture expired. Please run the capture again." });
        return;
      }
      sendResponse({
        ok: true,
        payload: {
          ...payload,
          slices: payload.slices.map(({ dataUrl: _dataUrl, ...slice }) => slice)
        }
      });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "GET_CAPTURE_SLICE") {
    getCapture(message.captureId).then((payload) => {
      const slice = payload?.slices?.[message.index];
      if (!slice) {
        sendResponse({ ok: false, error: `Slice ${message.index + 1} is missing.` });
        return;
      }
      sendResponse({ ok: true, slice });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "LIST_CAPTURES") {
    listCaptures().then((captures) => {
      sendResponse({ ok: true, captures });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "FORGET_CAPTURE") {
    removeCapture(message.captureId).then(() => {
      sendResponse({ ok: true });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  if (message?.type === "CLEAR_CAPTURES") {
    clearCaptures().then((captureIds) => {
      sendResponse({ ok: true, captureIds });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message || String(error) });
    });
    return true;
  }

  return false;
});

async function launchCaptureFromMessage(message) {
  const tab = await resolveCaptureTab(message.tabId);
  return launchCapture(tab, {
    mode: normalizeCaptureMode(message.mode)
  });
}

async function openSourceAtScroll(captureId) {
  const { tab, scrollTop } = await returnSourceToCaptureScroll(captureId);
  return { ok: true, tabId: tab.id, scrollTop };
}

async function startCaptureFromSourceScroll(captureId, resultTabId = null) {
  const { payload, tab, scrollTop } = await returnSourceToCaptureScroll(captureId);
  return launchCapture(tab, {
    mode: "immediate",
    startScrollTop: scrollTop,
    segmentPart: (Number(payload.segment?.part) || 1) + 1,
    parentCaptureId: payload.id || captureId,
    resultTabId: Number.isInteger(resultTabId) ? resultTabId : null
  });
}

async function returnSourceToCaptureScroll(captureId) {
  const payload = await getCapture(captureId);
  if (!payload) {
    throw new Error("Capture expired. Please run the capture again.");
  }
  const scrollTop = getResumeScrollTop(payload);
  if (!Number.isFinite(scrollTop)) {
    throw new Error("This capture has no saved resume position.");
  }

  const tab = await chrome.tabs.get(payload.source.tabId);
  const windowId = tab.windowId || payload.source.windowId;
  await activateCaptureTab(tab.id, windowId);
  await injectCaptureScripts(tab.id);
  const frameId = Number.isInteger(payload.target?.frameId) ? payload.target.frameId : 0;
  let response = await sendToFrame(tab.id, frameId, {
    type: "XF_SCROLL_TO_POSITION",
    scrollTop
  }).catch((error) => ({ ok: false, error: error.message || String(error) }));
  if (!response?.ok && frameId !== 0) {
    response = await sendToFrame(tab.id, 0, {
      type: "XF_SCROLL_TO_POSITION",
      scrollTop
    }).catch((error) => ({ ok: false, error: error.message || String(error) }));
  }
  if (!response?.ok) {
    throw new Error(response?.error || "Could not return to the source page position.");
  }
  return {
    payload,
    tab,
    scrollTop: Number.isFinite(Number(response.scrollTop)) ? Number(response.scrollTop) : scrollTop
  };
}

function getResumeScrollTop(payload) {
  const next = Number(payload.segment?.nextScrollTop);
  if (Number.isFinite(next)) {
    return next;
  }
  const end = Number(payload.segment?.endScrollTop);
  if (Number.isFinite(end)) {
    return end;
  }
  const targetHeight = Number(payload.target?.totalHeight);
  return Number.isFinite(targetHeight) ? targetHeight : null;
}

function normalizeCaptureMode(mode) {
  if (mode === "range" || mode === "pick") {
    return "range";
  }
  if (mode === "current") {
    return "current";
  }
  return "immediate";
}

async function resolveCaptureTab(tabId) {
  if (Number.isInteger(tabId)) {
    return chrome.tabs.get(tabId);
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error("No active tab found.");
  }
  return tab;
}

function launchCapture(tab, options = {}) {
  if (!tab?.id || !tab.windowId) {
    throw new Error("No active tab found.");
  }

  if (runningCaptures.has(tab.id)) {
    throw new Error("Full page capture is already running for this tab.");
  }

  const controller = {
    sessionId: crypto.randomUUID(),
    tabId: tab.id,
    windowId: tab.windowId,
    options,
    stopRequested: false,
    startedAt: Date.now()
  };

  runningCaptures.set(tab.id, controller);
  setCaptureBadge(tab.id, "CAP").catch(() => {});
  startCapture(tab, controller).catch(async (error) => {
    if (error?.name === "CaptureCancelledError") {
      return;
    }
    console.error(error);
    await showPageAlert(tab.id, `Full page capture failed: ${error.message || error}`).catch(() => {});
  }).finally(() => {
    runningCaptures.delete(tab.id);
    setCaptureBadge(tab.id, "").catch(() => {});
  });

  return { ok: true, tabId: tab.id, sessionId: controller.sessionId };
}

async function requestCaptureStop(tabId, sessionId) {
  let stopped = false;

  if (Number.isInteger(tabId) && runningCaptures.has(tabId)) {
    runningCaptures.get(tabId).stopRequested = true;
    stopped = true;
  }

  if (!stopped && sessionId) {
    for (const controller of runningCaptures.values()) {
      if (controller.sessionId === sessionId) {
        controller.stopRequested = true;
        stopped = true;
      }
    }
  }

  return { ok: true, stopped };
}

function requestAllCaptureStops() {
  let stopped = false;
  for (const controller of runningCaptures.values()) {
    controller.stopRequested = true;
    stopped = true;
  }
  return { ok: true, stopped };
}

async function getRunningState(tabId) {
  const controller = Number.isInteger(tabId) && runningCaptures.has(tabId)
    ? runningCaptures.get(tabId)
    : runningCaptures.values().next().value;
  return {
    ok: true,
    running: Boolean(controller),
    tabId: controller?.tabId || tabId,
    startedAt: controller?.startedAt || null
  };
}

async function startCapture(tab, controller) {
  const liveTab = await chrome.tabs.get(tab.id);
  const windowId = liveTab.windowId || tab.windowId;

  if (!canInject(liveTab.url)) {
    throw new Error("Chrome does not allow capture scripts on this page. Try a normal http/https page.");
  }

  await activateCaptureTab(tab.id, windowId, controller);
  await injectCaptureScripts(tab.id);
  const targetFrame = await chooseCaptureFrame(tab.id);
  const topViewport = await getTopViewport(tab.id);
  let startScrollTop = Number(controller.options.startScrollTop) || 0;

  let endScrollTop = null;

  if (controller.options.mode === "current") {
    const current = await sendToFrame(tab.id, targetFrame.frameId, { type: "XF_GET_CURRENT_SCROLL_POSITION" });
    if (!current?.ok) {
      throw new Error(current?.error || "Could not read the current page position.");
    }
    startScrollTop = Number.isFinite(Number(current.scrollTop)) ? Number(current.scrollTop) : 0;
  }

  if (controller.options.mode === "range") {
    const picked = await sendToFrame(tab.id, targetFrame.frameId, { type: "XF_PICK_CAPTURE_RANGE" });
    if (!picked?.ok) {
      throw new Error(picked?.error || "Could not read the custom capture range.");
    }
    if (picked.cancelled) {
      throw new CaptureCancelledError("Custom range capture was cancelled.");
    }
    startScrollTop = picked.startScrollTop;
    endScrollTop = Number.isFinite(picked.endScrollTop) ? picked.endScrollTop : null;
  }

  const prepared = await sendToFrame(tab.id, targetFrame.frameId, {
    type: "XF_PREPARE_CAPTURE",
    sessionId: controller.sessionId,
    enableKeyStop: true
  });
  if (!prepared?.ok) {
    throw new Error(prepared?.error || "Could not prepare the page.");
  }

  const frameOffset = targetFrame.offset || { x: 0, y: 0 };
  const segmentHeightLimit = normalizeSegmentHeight(controller.options.segmentHeightLimit);
  const rangeEndScrollTop = normalizeRangeEndScrollTop(endScrollTop, startScrollTop, prepared.target);
  const target = {
    ...prepared.target,
    frameId: targetFrame.frameId,
    frameUrl: targetFrame.url,
    frameLabel: targetFrame.frameId === 0 ? "top frame" : "iframe",
    totalHeight: 0,
    fullTotalHeight: prepared.target.totalHeight
  };
  const slices = [];
  let nextScrollTop = clampScrollTop(startScrollTop, prepared.target);
  let previousScrollTop = -1;
  let previousTotalHeight = 0;
  let segmentStartScrollTop = null;
  let stopReason = "complete";
  let reachedEnd = false;
  let continuationScrollTop = null;

  try {
    for (let index = 0; index < MAX_SLICES; index += 1) {
      if (controller.stopRequested && slices.length) {
        stopReason = "user-stop";
        continuationScrollTop = segmentStartScrollTop + target.totalHeight;
        break;
      }

      const tabReady = await waitForCaptureTabVisible(tab.id, windowId, controller);
      if (!tabReady) {
        stopReason = "user-stop";
        break;
      }
      const moved = await sendToFrame(tab.id, targetFrame.frameId, {
        type: "XF_SCROLL_TO",
        step: { scrollTop: nextScrollTop },
        index
      });
      if (!moved?.ok) {
        throw new Error(moved?.error || `Could not scroll to slice ${index + 1}.`);
      }

      if (
        index > 0
        && moved.scrollTop <= previousScrollTop + 1
        && moved.totalHeight <= previousTotalHeight + 1
      ) {
        reachedEnd = true;
        stopReason = "scroll-stalled";
        break;
      }

      if (segmentStartScrollTop === null) {
        segmentStartScrollTop = moved.scrollTop;
      }

      const relativeScrollTop = Math.max(0, moved.scrollTop - segmentStartScrollTop);
      const segmentRemaining = segmentHeightLimit - relativeScrollTop;
      const rangeRemaining = Number.isFinite(rangeEndScrollTop) ? rangeEndScrollTop - moved.scrollTop : Infinity;
      if (rangeRemaining <= 1 && slices.length) {
        reachedEnd = true;
        stopReason = "range-end";
        break;
      }
      if (segmentRemaining <= 1 && slices.length) {
        stopReason = "segment-limit";
        continuationScrollTop = segmentStartScrollTop + target.totalHeight;
        break;
      }

      const sliceVisibleHeight = Math.max(0, Math.min(moved.targetVisibleHeight, segmentRemaining, rangeRemaining));
      if (sliceVisibleHeight <= 1) {
        reachedEnd = Number.isFinite(rangeEndScrollTop);
        stopReason = reachedEnd ? "range-end" : "segment-limit";
        continuationScrollTop = reachedEnd ? null : segmentStartScrollTop + target.totalHeight;
        break;
      }

      const dataUrl = await captureVisibleTabQueued(windowId, tab.id, controller);
      if (!dataUrl) {
        stopReason = "user-stop";
        continuationScrollTop = segmentStartScrollTop + target.totalHeight;
        break;
      }
      const totalHeight = Math.max(moved.totalHeight, moved.scrollTop + moved.targetVisibleHeight);
      target.fullTotalHeight = Math.max(target.fullTotalHeight, totalHeight);
      target.totalHeight = Math.max(target.totalHeight, relativeScrollTop + sliceVisibleHeight);
      previousScrollTop = moved.scrollTop;
      previousTotalHeight = totalHeight;

      slices.push({
        index: slices.length,
        dataUrl,
        scrollTop: relativeScrollTop,
        absoluteScrollTop: moved.scrollTop,
        cropRect: offsetCropRect(moved.cropRect, frameOffset),
        viewport: topViewport,
        targetVisibleHeight: sliceVisibleHeight
      });

      if (controller.stopRequested) {
        stopReason = "user-stop";
        continuationScrollTop = segmentStartScrollTop + target.totalHeight;
        break;
      }

      if (moved.isAtEnd || moved.nextScrollTop <= moved.scrollTop + 1) {
        reachedEnd = true;
        stopReason = "complete";
        break;
      }

      if (relativeScrollTop + sliceVisibleHeight >= segmentHeightLimit - 1) {
        stopReason = "segment-limit";
        continuationScrollTop = segmentStartScrollTop + target.totalHeight;
        break;
      }

      if (Number.isFinite(rangeEndScrollTop) && moved.scrollTop + sliceVisibleHeight >= rangeEndScrollTop - 1) {
        reachedEnd = true;
        stopReason = "range-end";
        break;
      }

      nextScrollTop = moved.nextScrollTop;
    }
  } finally {
    await sendToFrame(tab.id, targetFrame.frameId, { type: "XF_RESTORE_CAPTURE" }).catch(() => {});
  }

  if (!slices.length) {
    if (stopReason === "user-stop") {
      throw new CaptureCancelledError("Capture cancelled before any screenshot was taken.");
    }
    throw new Error("No screenshots were captured.");
  }

  const segmentStart = segmentStartScrollTop || 0;
  const segmentEnd = segmentStart + target.totalHeight;
  const fullTotalHeight = Math.max(target.fullTotalHeight, segmentEnd);
  const canReturnToSource = !reachedEnd
    && Number.isFinite(continuationScrollTop)
    && continuationScrollTop < fullTotalHeight - 2;
  const captureId = crypto.randomUUID();
  const payload = {
    id: captureId,
    capturedAt: new Date().toISOString(),
    source: {
      tabId: tab.id,
      url: liveTab.url || tab.url || "",
      title: liveTab.title || tab.title || ""
    },
    target,
    segment: {
      part: controller.options.segmentPart || 1,
      parentCaptureId: controller.options.parentCaptureId || "",
      startScrollTop: segmentStart,
      endScrollTop: segmentEnd,
      nextScrollTop: canReturnToSource ? continuationScrollTop : null,
      fullTotalHeight,
      limitHeight: segmentHeightLimit,
      rangeEndScrollTop,
      reason: stopReason,
      canReturnToSource,
      stoppedByUser: stopReason === "user-stop"
    },
    slices
  };
  captures.set(captureId, payload);
  await persistCapture(captureId, payload);

  await openCaptureResultTab(captureId, controller.options.resultTabId);
}

async function openCaptureResultTab(captureId, resultTabId) {
  const url = chrome.runtime.getURL(`result/result.html?id=${encodeURIComponent(captureId)}`);
  if (Number.isInteger(resultTabId)) {
    try {
      const tab = await chrome.tabs.update(resultTabId, { url, active: true });
      if (Number.isInteger(tab?.windowId)) {
        await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
      }
      return;
    } catch (_error) {
      // The original result tab may have been closed. Fall back to opening a new result tab.
    }
  }
  await chrome.tabs.create({ url });
}

async function injectCaptureScripts(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content/capture-target.js"]
    });
  } catch (error) {
    console.warn("Could not inject all frames, falling back to the top frame.", error);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/capture-target.js"]
    });
  }
}

async function chooseCaptureFrame(tabId) {
  const frames = await getFrames(tabId);
  const measured = [];

  for (const frame of frames) {
    const measurement = await sendToFrame(tabId, frame.frameId, { type: "XF_MEASURE_CAPTURE" }).catch(() => null);
    if (!measurement?.ok) {
      continue;
    }

    const offset = frame.frameId === 0
      ? { x: 0, y: 0, ok: true }
      : await locateFrameOffset(tabId, frames, frame.frameId);
    if (!offset.ok) {
      continue;
    }

    measured.push({
      frameId: frame.frameId,
      parentFrameId: frame.parentFrameId,
      url: frame.url || "",
      offset,
      score: measurement.target.score * (frame.frameId === 0 ? 1 : 1.08),
      target: measurement.target
    });
  }

  measured.sort((a, b) => b.score - a.score);
  const selected = measured[0];
  if (!selected) {
    throw new Error("Could not find a scrollable capture target.");
  }
  return selected;
}

async function getFrames(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => null);
  return frames?.length ? frames : [{ frameId: 0, parentFrameId: -1, url: "" }];
}

async function locateFrameOffset(tabId, frames, frameId) {
  let current = frames.find((frame) => frame.frameId === frameId);
  let x = 0;
  let y = 0;

  while (current && current.frameId !== 0) {
    const parent = frames.find((frame) => frame.frameId === current.parentFrameId);
    if (!parent) {
      return { x: 0, y: 0, ok: false };
    }

    const list = await sendToFrame(tabId, parent.frameId, { type: "XF_LIST_IFRAMES" }).catch(() => null);
    const match = findMatchingIframe(list?.frames || [], current);
    if (!match) {
      return { x: 0, y: 0, ok: false };
    }

    x += match.rect.left;
    y += match.rect.top;
    current = parent;
  }

  return { x, y, ok: true };
}

function findMatchingIframe(iframes, frame) {
  const frameUrl = normalizeUrl(frame.url || "");
  return iframes.find((item) => normalizeUrl(item.src || "") === frameUrl)
    || iframes.find((item) => frameUrl && normalizeUrl(item.src || "").startsWith(frameUrl))
    || iframes.find((item) => {
      const src = normalizeUrl(item.src || "");
      return src && frameUrl && frameUrl.startsWith(src);
    });
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return url;
  }
}

async function getTopViewport(tabId) {
  const response = await sendToFrame(tabId, 0, { type: "XF_GET_VIEWPORT" });
  if (!response?.ok) {
    throw new Error(response?.error || "Could not read top viewport.");
  }
  return response.viewport;
}

function captureVisibleTabQueued(windowId, expectedTabId, controller) {
  const job = visibleTabCaptureQueue.then(async () => {
    while (!controller?.stopRequested) {
      await waitForCaptureSlot();
      const ready = await waitForCaptureTabVisible(expectedTabId, windowId, controller);
      if (!ready) {
        return null;
      }

      let dataUrl = "";
      try {
        dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
      } catch (error) {
        if (isCaptureQuotaError(error)) {
          await setCaptureBadge(expectedTabId, "WAIT").catch(() => {});
          await sleep(CAPTURE_QUOTA_RETRY_MS);
          continue;
        }
        if (!isTemporaryTabEditError(error)) {
          throw error;
        }
        await setCaptureBadge(expectedTabId, "WAIT").catch(() => {});
        await sleep(CAPTURE_TAB_WAIT_MS);
        continue;
      }
      lastVisibleTabCaptureAt = Date.now();

      if (await getActiveTabId(windowId) === expectedTabId) {
        await setCaptureBadge(expectedTabId, "CAP").catch(() => {});
        return dataUrl;
      }

      await setCaptureBadge(expectedTabId, "WAIT").catch(() => {});
      await sleep(CAPTURE_TAB_WAIT_MS);
    }

    return null;
  });
  visibleTabCaptureQueue = job.catch(() => {});
  return job;
}

async function activateCaptureTab(tabId, windowId, controller) {
  if (!Number.isInteger(tabId) || !Number.isInteger(windowId)) {
    return;
  }

  for (let attempt = 0; attempt < 8 && !controller?.stopRequested; attempt += 1) {
    const activeTabId = await getActiveTabId(windowId);
    if (activeTabId === tabId) {
      await chrome.windows.update(windowId, { focused: true }).catch(() => {});
      await sleep(80);
      return;
    }

    try {
      await chrome.tabs.update(tabId, { active: true });
      await chrome.windows.update(windowId, { focused: true }).catch(() => {});
      await sleep(120);
      return;
    } catch (error) {
      if (!isTemporaryTabEditError(error)) {
        throw error;
      }
      await setCaptureBadge(tabId, "WAIT").catch(() => {});
      await sleep(260);
    }
  }
}

function isTemporaryTabEditError(error) {
  return /tabs cannot be edited right now|user may be dragging a tab/i.test(error?.message || String(error));
}

function isCaptureQuotaError(error) {
  return /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND|captureVisibleTab.*quota|quota/i.test(error?.message || String(error));
}

async function waitForCaptureTabVisible(tabId, windowId, controller) {
  if (!Number.isInteger(tabId) || !Number.isInteger(windowId)) {
    return true;
  }

  while (!controller?.stopRequested) {
    const activeTabId = await getActiveTabId(windowId);
    if (activeTabId === tabId) {
      await setCaptureBadge(tabId, "CAP").catch(() => {});
      return true;
    }

    await setCaptureBadge(tabId, "WAIT").catch(() => {});
    await sleep(CAPTURE_TAB_WAIT_MS);
  }

  return false;
}

async function getActiveTabId(windowId) {
  const [active] = await chrome.tabs.query({ active: true, windowId });
  return active?.id || null;
}

async function waitForCaptureSlot() {
  const elapsed = Date.now() - lastVisibleTabCaptureAt;
  if (elapsed < CAPTURE_INTERVAL_MS) {
    await sleep(CAPTURE_INTERVAL_MS - elapsed);
  }
}

function normalizeSegmentHeight(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_SEGMENT_HEIGHT;
  }
  return Math.max(MIN_SEGMENT_HEIGHT, Math.floor(numeric));
}

function normalizeRangeEndScrollTop(value, startScrollTop, target) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const maxBottom = Math.max(0, target?.totalHeight || 0);
  const end = Math.min(Math.floor(numeric), maxBottom);
  return end > startScrollTop + 8 ? end : null;
}

function clampScrollTop(value, target) {
  const maxTop = Math.max(0, (target?.totalHeight || 0) - (target?.visibleHeight || 0));
  return Math.max(0, Math.min(Math.floor(Number(value) || 0), maxTop));
}

async function setCaptureBadge(tabId, text) {
  await chrome.action.setBadgeText({ tabId, text });
  if (text) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#0f766e" }).catch(() => {});
  }
}

function offsetCropRect(cropRect, offset) {
  return {
    x: cropRect.x + (offset.x || 0),
    y: cropRect.y + (offset.y || 0),
    width: cropRect.width,
    height: cropRect.height
  };
}

async function getCapture(captureId) {
  if (captures.has(captureId)) {
    return captures.get(captureId);
  }
  const stored = await chrome.storage.local.get(storageKey(captureId));
  const payload = stored[storageKey(captureId)];
  if (payload) {
    captures.set(captureId, payload);
  }
  return payload || null;
}

async function listCaptures() {
  const stored = await chrome.storage.local.get(CAPTURE_INDEX_KEY);
  const storedIndex = Array.isArray(stored[CAPTURE_INDEX_KEY]) ? stored[CAPTURE_INDEX_KEY] : [];
  const ids = [...new Set([...storedIndex, ...captures.keys()])];
  const keys = ids.map(storageKey);
  const storedCaptures = keys.length ? await chrome.storage.local.get(keys) : {};
  const staleIds = [];
  const result = [];

  for (const id of ids) {
    const payload = captures.get(id) || storedCaptures[storageKey(id)];
    if (!payload) {
      staleIds.push(id);
      continue;
    }
    result.push(captureMeta(payload));
  }

  if (staleIds.length) {
    await chrome.storage.local.set({
      [CAPTURE_INDEX_KEY]: storedIndex.filter((id) => !staleIds.includes(id))
    });
  }

  return result.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

function captureMeta(payload) {
  return {
    id: payload.id,
    capturedAt: payload.capturedAt,
    title: payload.source?.title || "",
    url: payload.source?.url || "",
    targetLabel: payload.target?.label || "",
    targetMode: payload.target?.mode || "",
    sliceCount: payload.slices?.length || 0,
    totalHeight: payload.target?.totalHeight || 0,
    visibleWidth: payload.target?.visibleWidth || 0,
    segment: payload.segment || null
  };
}

async function persistCapture(captureId, payload) {
  try {
    const stored = await chrome.storage.local.get(CAPTURE_INDEX_KEY);
    const index = Array.isArray(stored[CAPTURE_INDEX_KEY]) ? stored[CAPTURE_INDEX_KEY] : [];
    const nextIndex = [captureId, ...index.filter((id) => id !== captureId)].slice(0, MAX_STORED_CAPTURES);
    const removeIds = index.filter((id) => !nextIndex.includes(id));
    await chrome.storage.local.set({
      [storageKey(captureId)]: payload,
      [CAPTURE_INDEX_KEY]: nextIndex
    });
    if (removeIds.length) {
      await chrome.storage.local.remove(removeIds.map(storageKey));
    }
  } catch (error) {
    console.warn("Capture persistence failed; keeping in memory only.", error);
  }
}

async function removeCapture(captureId) {
  if (!captureId) {
    return;
  }
  captures.delete(captureId);
  const stored = await chrome.storage.local.get(CAPTURE_INDEX_KEY);
  const index = Array.isArray(stored[CAPTURE_INDEX_KEY]) ? stored[CAPTURE_INDEX_KEY] : [];
  await chrome.storage.local.set({
    [CAPTURE_INDEX_KEY]: index.filter((id) => id !== captureId)
  });
  await chrome.storage.local.remove(storageKey(captureId));
}

async function clearCaptures() {
  const allStored = await chrome.storage.local.get(null);
  const storedIds = Object.keys(allStored)
    .filter((key) => key.startsWith("capture:"))
    .map((key) => key.slice("capture:".length));
  const ids = [...new Set([...storedIds, ...captures.keys()])];
  captures.clear();
  await chrome.storage.local.remove([...ids.map(storageKey), CAPTURE_INDEX_KEY]);
  await chrome.storage.local.set({ [CAPTURE_INDEX_KEY]: [] });
  return ids;
}

function storageKey(captureId) {
  return `capture:${captureId}`;
}

function canInject(url = "") {
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
}

function sendToFrame(tabId, frameId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, { frameId }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function showPageAlert(tabId, message) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (text) => window.alert(text),
    args: [message]
  });
}
