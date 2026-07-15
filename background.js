import "./shared/i18n.js";

const captures = new Map();
const runningCaptures = new Map();

let lastVisibleTabCaptureAt = 0;
let visibleTabCaptureQueue = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CAPTURE_INTERVAL_MS = 700;
const CAPTURE_TAB_WAIT_MS = 220;
const CAPTURE_QUOTA_RETRY_MS = 1250;
const MAX_SLICES = 260;
const DEFAULT_SEGMENT_HEIGHT = 96000;
const MIN_SEGMENT_HEIGHT = 2400;
const CAPTURE_INDEX_KEY = "xfCaptureIndex";
const MAX_STORED_CAPTURES = 12;
const PENDING_CONTINUATION_PREFIX = "xfPendingContinuation:";
const PENDING_CONTINUATION_MAX_AGE_MS = 30 * 60 * 1000;
const INTERFACE_LOCALE_KEY = "xfFullPageCapture:locale";
const pendingContinuations = new Map();
let interfaceLocale = "en";

Promise.resolve(chrome.storage?.local?.get?.(INTERFACE_LOCALE_KEY))
  .then((stored) => updateActionTitle(stored?.[INTERFACE_LOCALE_KEY]))
  .catch(() => {});

chrome.storage?.onChanged?.addListener?.((changes, areaName) => {
  if (areaName === "local" && changes?.[INTERFACE_LOCALE_KEY]) {
    updateActionTitle(changes[INTERFACE_LOCALE_KEY].newValue);
  }
});

function updateActionTitle(locale) {
  interfaceLocale = /^zh(?:-|$)/i.test(locale || "") ? "zh-CN" : "en";
  const title = interfaceLocale === "en" ? "Capture full page" : "截取完整页面";
  return chrome.action?.setTitle?.({ title })?.catch?.(() => {});
}

function backgroundT(value) {
  return globalThis.XFI18n?.translateText?.(value, interfaceLocale) ?? value;
}

function backgroundErrorForUser(error) {
  const message = error?.message || String(error);
  if (/Capture expired\. Please run the capture again\./i.test(message)) {
    return backgroundT("截图缓存已失效，请重新截图。");
  }
  if (/This capture has no saved resume position\./i.test(message)) {
    return backgroundT("当前截图没有可继续获取的结束位置。");
  }
  const missingSlice = message.match(/Slice\s+(\d+)\s+is missing\./i);
  if (missingSlice) {
    return backgroundT(`第 ${missingSlice[1]} 张截图切片缺失。`);
  }
  return backgroundT(message);
}

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
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "OPEN_SOURCE_AT_SCROLL") {
    openSourceAtScroll(message.captureId, message.capture).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "OPEN_SOURCE") {
    openOriginalSource(message.captureId, message.source).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "START_CAPTURE_FROM_SOURCE_SCROLL") {
    startCaptureFromSourceScroll(message.captureId, _sender?.tab?.id).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "STOP_CAPTURE" || message?.type === "XF_USER_STOP_CAPTURE") {
    requestCaptureStop(message.tabId, message.sessionId).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "GET_RUNNING_STATE") {
    getRunningState(message.tabId).then(sendResponse).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "GET_CAPTURE_META") {
    getCapture(message.captureId).then((payload) => {
      if (!payload) {
        sendResponse({ ok: false, error: backgroundT("截图缓存已失效，请重新截图。") });
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
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "GET_CAPTURE_SLICE") {
    getCapture(message.captureId).then((payload) => {
      const slice = payload?.slices?.[message.index];
      if (!slice) {
        sendResponse({ ok: false, error: backgroundT(`第 ${message.index + 1} 张截图切片缺失。`) });
        return;
      }
      sendResponse({ ok: true, slice });
    }).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "LIST_CAPTURES") {
    listCaptures().then((captures) => {
      sendResponse({ ok: true, captures });
    }).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "FORGET_CAPTURE") {
    removeCapture(message.captureId).then(() => {
      sendResponse({ ok: true });
    }).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  if (message?.type === "CLEAR_CAPTURES") {
    clearCaptures().then((captureIds) => {
      sendResponse({ ok: true, captureIds });
    }).catch((error) => {
      sendResponse({ ok: false, error: backgroundErrorForUser(error) });
    });
    return true;
  }

  return false;
});

async function launchCaptureFromMessage(message) {
  const tab = await resolveCaptureTab(message.tabId);
  const mode = normalizeCaptureMode(message.mode);
  const continuation = await takePendingContinuation(tab, mode);
  return launchCapture(tab, {
    mode,
    captureProfile: normalizeCaptureProfile(message.captureProfile || (mode === "range" ? "default" : message.mode || "auto")),
    ...continuation
  });
}

async function openSourceAtScroll(captureId, fallbackCapture = null) {
  const { payload, tab, scrollTop } = await returnSourceToCaptureScroll(captureId, fallbackCapture);
  await rememberPendingContinuation(tab, payload, captureId);
  return { ok: true, tabId: tab.id, scrollTop };
}

async function rememberPendingContinuation(tab, payload, captureId) {
  if (!Number.isInteger(tab?.id)) {
    return;
  }
  const parentCaptureId = payload?.id || captureId || "";
  if (!parentCaptureId) {
    return;
  }
  const pending = {
    parentCaptureId,
    segmentPart: (Number(payload?.segment?.part) || 1) + 1,
    sourceUrl: String(payload?.source?.url || tab.url || ""),
    createdAt: Date.now()
  };
  pendingContinuations.set(tab.id, pending);
  await pendingContinuationStorage().set({ [pendingContinuationKey(tab.id)]: pending }).catch(() => {});
}

async function takePendingContinuation(tab, mode) {
  if (!Number.isInteger(tab?.id)) {
    return {};
  }
  const key = pendingContinuationKey(tab.id);
  let pending = pendingContinuations.get(tab.id) || null;
  if (!pending) {
    const stored = await pendingContinuationStorage().get(key).catch(() => ({}));
    pending = stored?.[key] || null;
  }
  if (!pending) {
    return {};
  }

  pendingContinuations.delete(tab.id);
  await pendingContinuationStorage().remove(key).catch(() => {});

  const age = Date.now() - Number(pending.createdAt || 0);
  const sourceMatches = !pending.sourceUrl
    || !tab.url
    || normalizeUrl(pending.sourceUrl) === normalizeUrl(tab.url);
  if (
    mode !== "current"
    || !pending.parentCaptureId
    || !Number.isFinite(age)
    || age < 0
    || age > PENDING_CONTINUATION_MAX_AGE_MS
    || !sourceMatches
  ) {
    return {};
  }
  return {
    segmentPart: Math.max(2, Number(pending.segmentPart) || 2),
    parentCaptureId: pending.parentCaptureId
  };
}

function pendingContinuationKey(tabId) {
  return `${PENDING_CONTINUATION_PREFIX}${tabId}`;
}

function pendingContinuationStorage() {
  return chrome.storage.session || chrome.storage.local;
}

async function openOriginalSource(captureId, fallbackSource = null) {
  const payload = await getCapture(captureId) || (fallbackSource ? { source: fallbackSource } : null);
  if (!payload) {
    throw new Error(backgroundT("截图缓存已失效，请重新截图。"));
  }
  const tab = await ensureSourceTab(payload);
  await activateCaptureTab(tab.id, tab.windowId || payload.source?.windowId);
  return { ok: true, tabId: tab.id };
}

async function startCaptureFromSourceScroll(captureId, resultTabId = null) {
  const { payload, tab, scrollTop } = await returnSourceToCaptureScroll(captureId);
  return launchCapture(tab, {
    mode: "immediate",
    captureProfile: normalizeCaptureProfile(payload.target?.captureProfile),
    startScrollTop: scrollTop,
    segmentPart: (Number(payload.segment?.part) || 1) + 1,
    parentCaptureId: payload.id || captureId,
    resultTabId: Number.isInteger(resultTabId) ? resultTabId : null
  });
}

async function returnSourceToCaptureScroll(captureId, fallbackCapture = null) {
  const payload = await getCapture(captureId) || fallbackCapture;
  if (!payload) {
    throw new Error(backgroundT("截图缓存已失效，请重新截图。"));
  }
  const scrollTop = getResumeScrollTop(payload);
  if (!Number.isFinite(scrollTop)) {
    throw new Error(backgroundT("当前截图没有可继续获取的结束位置。"));
  }

  const tab = await ensureSourceTab(payload);
  const windowId = tab.windowId || payload.source.windowId;
  await activateCaptureTab(tab.id, windowId);
  const frameId = Number.isInteger(payload.target?.frameId) ? payload.target.frameId : 0;
  let response = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await injectCaptureScripts(tab.id);
    response = await sendResumeScrollMessage(tab.id, frameId, payload, scrollTop);
    if (response?.ok && isResumePositionReady(response.scrollTop, scrollTop)) {
      break;
    }
    await sleep(Math.min(1200, 300 + attempt * 120));
  }
  if (!response?.ok || !isResumePositionReady(response.scrollTop, scrollTop)) {
    throw new Error(response?.error || backgroundT("原文页面已重新打开，但长内容还没有恢复到保存的位置。"));
  }
  return {
    payload,
    tab,
    scrollTop: Number.isFinite(Number(response.scrollTop)) ? Number(response.scrollTop) : scrollTop
  };
}

async function sendResumeScrollMessage(tabId, frameId, payload, scrollTop) {
  const message = {
    type: "XF_SCROLL_TO_POSITION",
    scrollTop,
    captureProfile: normalizeCaptureProfile(payload.target?.captureProfile),
    target: buildResumeTargetHint(payload)
  };
  let response = await sendToFrame(tabId, frameId, message)
    .catch((error) => ({ ok: false, error: error.message || String(error) }));
  if ((!response?.ok || !isResumePositionReady(response.scrollTop, scrollTop)) && frameId !== 0) {
    response = await sendToFrame(tabId, 0, message)
      .catch((error) => ({ ok: false, error: error.message || String(error) }));
  }
  return response;
}

function isResumePositionReady(actualScrollTop, expectedScrollTop) {
  const actual = Number(actualScrollTop);
  const expected = Number(expectedScrollTop);
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    return false;
  }
  return Math.abs(actual - expected) <= Math.max(8, expected * 0.002);
}

async function ensureSourceTab(payload) {
  const source = payload?.source || {};
  const sourceUrl = String(source.url || "").trim();
  let tab = null;

  if (Number.isInteger(source.tabId)) {
    tab = await chrome.tabs.get(source.tabId).catch(() => null);
    if (tab && sourceUrl && tab.url && normalizeUrl(tab.url) !== normalizeUrl(sourceUrl)) {
      tab = null;
    }
  }

  if (tab) {
    return tab;
  }
  if (!sourceUrl || !canInject(sourceUrl)) {
    throw new Error(backgroundT("原文标签页已关闭，并且无法重新打开该页面。"));
  }

  tab = await chrome.tabs.create({ url: sourceUrl, active: true });
  return waitForSourceTabReady(tab);
}

async function waitForSourceTabReady(initialTab) {
  let tab = initialTab;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (tab?.status === "complete") {
      return tab;
    }
    await sleep(250);
    tab = await chrome.tabs.get(initialTab.id).catch(() => tab);
  }
  return tab;
}

function getResumeScrollTop(payload) {
  const end = Number(payload.segment?.endScrollTop);
  if (Number.isFinite(end)) {
    return clampResumeScrollTop(payload, end);
  }
  const next = Number(payload.segment?.nextScrollTop);
  if (Number.isFinite(next)) {
    return clampResumeScrollTop(payload, next);
  }
  const targetHeight = Number(payload.target?.totalHeight);
  return Number.isFinite(targetHeight) ? clampResumeScrollTop(payload, targetHeight) : null;
}

function clampResumeScrollTop(payload, scrollTop) {
  const fullHeight = Number(payload.segment?.fullTotalHeight || payload.target?.fullTotalHeight || payload.target?.totalHeight);
  const visibleHeight = Number(payload.target?.visibleHeight);
  if (!Number.isFinite(fullHeight) || !Number.isFinite(visibleHeight) || fullHeight <= visibleHeight) {
    return Math.max(0, scrollTop);
  }
  return Math.max(0, Math.min(scrollTop, fullHeight - visibleHeight));
}

function buildResumeTargetHint(payload) {
  return {
    mode: payload.target?.mode || "",
    label: payload.target?.label || "",
    totalHeight: payload.target?.totalHeight || 0,
    fullTotalHeight: payload.segment?.fullTotalHeight || payload.target?.fullTotalHeight || payload.target?.totalHeight || 0,
    visibleHeight: payload.target?.visibleHeight || 0
  };
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

function normalizeCaptureProfile(profile) {
  if (profile === "default") {
    return "default";
  }
  if (profile === "document" || profile === "ppt" || profile === "presentation" || profile === "slides" || profile === "auto") {
    return "auto";
  }
  return "auto";
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
    await showPageAlert(tab.id, formatCaptureErrorForUser(error)).catch(() => {});
  }).finally(() => {
    runningCaptures.delete(tab.id);
    setCaptureBadge(tab.id, "").catch(() => {});
  });

  return { ok: true, tabId: tab.id, sessionId: controller.sessionId };
}

async function requestCaptureStop(tabId, sessionId) {
  let stopped = false;
  const tabsToCancel = new Set();

  if (Number.isInteger(tabId) && runningCaptures.has(tabId)) {
    const controller = runningCaptures.get(tabId);
    controller.stopRequested = true;
    tabsToCancel.add(controller.tabId);
    stopped = true;
  }

  if (!stopped && sessionId) {
    for (const controller of runningCaptures.values()) {
      if (controller.sessionId === sessionId) {
        controller.stopRequested = true;
        tabsToCancel.add(controller.tabId);
        stopped = true;
      }
    }
  }

  await Promise.allSettled([...tabsToCancel].map(cancelCaptureRangePicker));

  return { ok: true, stopped };
}

function requestAllCaptureStops() {
  let stopped = false;
  for (const controller of runningCaptures.values()) {
    controller.stopRequested = true;
    cancelCaptureRangePicker(controller.tabId).catch(() => {});
    stopped = true;
  }
  return { ok: true, stopped };
}

async function cancelCaptureRangePicker(tabId) {
  const frames = await getFrames(tabId);
  const message = { type: "XF_CANCEL_CAPTURE_RANGE" };
  await Promise.allSettled(frames.map((frame) => sendToFrame(tabId, frame.frameId, message)));
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
  await setCaptureStopArmed(tab.id, controller.sessionId, true);
  try {
  if (controller.stopRequested) {
    throw new CaptureCancelledError("Capture cancelled before the range picker opened.");
  }
  const captureProfile = normalizeCaptureProfile(controller.options.captureProfile);
  const targetFrame = await chooseCaptureFrame(tab.id, captureProfile);
  const topViewport = await getTopViewport(tab.id);
  let startScrollTop = Number(controller.options.startScrollTop) || 0;
  let startPageIndex = null;

  let endScrollTop = null;

  if (controller.options.mode === "current") {
    const current = await sendToFrame(tab.id, targetFrame.frameId, {
      type: "XF_GET_CURRENT_SCROLL_POSITION",
      captureProfile
    });
    if (!current?.ok) {
      throw new Error(current?.error || "Could not read the current page position.");
    }
    startScrollTop = Number.isFinite(Number(current.scrollTop)) ? Number(current.scrollTop) : 0;
    startPageIndex = Number.isFinite(Number(current.pageIndex)) ? Math.max(0, Math.floor(Number(current.pageIndex))) : null;
  }

  if (controller.options.mode === "range") {
    const picked = await sendToFrame(tab.id, targetFrame.frameId, { type: "XF_PICK_CAPTURE_RANGE" });
    if (!picked?.ok) {
      throw new Error(picked?.error || "Could not read the custom capture range.");
    }
    if (picked.cancelled) {
      throw new CaptureCancelledError("Custom range capture was cancelled.");
    }
    if (controller.stopRequested) {
      throw new CaptureCancelledError("Custom range capture was cancelled.");
    }
    startScrollTop = picked.startScrollTop;
    endScrollTop = Number.isFinite(picked.endScrollTop) ? picked.endScrollTop : null;
  }

  const prepared = await sendToFrame(tab.id, targetFrame.frameId, {
    type: "XF_PREPARE_CAPTURE",
    sessionId: controller.sessionId,
    enableKeyStop: true,
    captureProfile
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
    captureProfile,
    totalHeight: 0,
    fullTotalHeight: prepared.target.totalHeight
  };

  if (prepared.target.captureStrategy === "pages" && controller.options.mode !== "range") {
    await capturePageSequence({
      tab,
      liveTab,
      controller,
      targetFrame,
      topViewport,
      frameOffset,
      target,
      startPageIndex
    });
    return;
  }

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
      windowId: tab.windowId,
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
  } finally {
    await setCaptureStopArmed(tab.id, controller.sessionId, false);
  }
}

async function capturePageSequence({
  tab,
  liveTab,
  controller,
  targetFrame,
  topViewport,
  frameOffset,
  target,
  startPageIndex
}) {
  const pageCount = clampPageCount(target.pageCount);
  const firstPageIndex = Number.isInteger(startPageIndex)
    ? Math.max(0, Math.min(startPageIndex, pageCount - 1))
    : 0;
  const slices = [];
  let stopReason = "complete";
  let logicalTop = 0;
  let lastLogicalHeight = 0;

  try {
    for (let pageIndex = firstPageIndex; pageIndex < pageCount && slices.length < MAX_SLICES; pageIndex += 1) {
      if (controller.stopRequested && slices.length) {
        stopReason = "user-stop";
        break;
      }

      const tabReady = await waitForCaptureTabVisible(tab.id, controller.windowId, controller);
      if (!tabReady) {
        stopReason = "user-stop";
        break;
      }

      const moved = await sendToFrame(tab.id, targetFrame.frameId, {
        type: "XF_CAPTURE_PAGE_STEP",
        pageIndex,
        pageCount
      });
      if (!moved?.ok) {
        throw new Error(moved?.error || `Could not open page ${pageIndex + 1}.`);
      }

      const logicalHeight = Math.max(
        1,
        Math.round(Number(moved.logicalHeight) || Number(moved.targetVisibleHeight) || Number(moved.cropRect?.height) || 1)
      );
      lastLogicalHeight = logicalHeight;

      const dataUrl = moved.dataUrl || await captureVisibleTabQueued(controller.windowId, tab.id, controller);
      if (!dataUrl) {
        stopReason = "user-stop";
        break;
      }

      const isPageImageCapture = moved.captureSource === "page-canvas";
      const cropRect = isPageImageCapture
        ? moved.cropRect
        : offsetCropRect(moved.cropRect, frameOffset);
      const viewport = isPageImageCapture && moved.viewport
        ? moved.viewport
        : topViewport;
      target.visibleWidth = Math.max(target.visibleWidth || 0, cropRect.width || 0);
      target.visibleHeight = logicalHeight;
      target.totalHeight = logicalTop + logicalHeight;
      target.fullTotalHeight = Math.max(target.fullTotalHeight || 0, pageCount * logicalHeight);
      target.pageCount = pageCount;
      target.captureStrategy = "pages";

      slices.push({
        index: slices.length,
        dataUrl,
        scrollTop: logicalTop,
        absoluteScrollTop: Number.isFinite(Number(moved.absoluteScrollTop)) ? Number(moved.absoluteScrollTop) : pageIndex,
        pageIndex: Number.isFinite(Number(moved.pageIndex)) ? Number(moved.pageIndex) : pageIndex,
        pageNumber: Number.isFinite(Number(moved.pageNumber)) ? Number(moved.pageNumber) : pageIndex + 1,
        cropRect,
        viewport,
        targetVisibleHeight: logicalHeight
      });

      logicalTop += logicalHeight;

      if (controller.stopRequested) {
        stopReason = "user-stop";
        break;
      }
    }
  } finally {
    await sendToFrame(tab.id, targetFrame.frameId, { type: "XF_RESTORE_CAPTURE" }).catch(() => {});
  }

  if (!slices.length) {
    if (stopReason === "user-stop") {
      throw new CaptureCancelledError("Capture cancelled before any page was captured.");
    }
    throw new Error("No pages were captured.");
  }

  const reachedEnd = firstPageIndex + slices.length >= pageCount;
  if (!reachedEnd && stopReason === "complete") {
    stopReason = slices.length >= MAX_SLICES ? "page-limit" : "user-stop";
  }

  const captureId = crypto.randomUUID();
  const payload = {
    id: captureId,
    capturedAt: new Date().toISOString(),
    source: {
      tabId: tab.id,
      windowId: tab.windowId,
      url: liveTab.url || tab.url || "",
      title: liveTab.title || tab.title || ""
    },
    target: {
      ...target,
      totalHeight: logicalTop,
      fullTotalHeight: pageCount * (lastLogicalHeight || target.visibleHeight || 1),
      pageStartIndex: firstPageIndex,
      pageEndIndex: firstPageIndex + slices.length - 1
    },
    segment: {
      part: controller.options.segmentPart || 1,
      parentCaptureId: controller.options.parentCaptureId || "",
      startScrollTop: 0,
      endScrollTop: logicalTop,
      nextScrollTop: null,
      fullTotalHeight: pageCount * (lastLogicalHeight || target.visibleHeight || 1),
      limitHeight: null,
      rangeEndScrollTop: null,
      reason: stopReason,
      canReturnToSource: false,
      stoppedByUser: stopReason === "user-stop",
      pageStartIndex: firstPageIndex,
      pageEndIndex: firstPageIndex + slices.length - 1
    },
    slices
  };
  captures.set(captureId, payload);
  await persistCapture(captureId, payload);

  await openCaptureResultTab(captureId, controller.options.resultTabId);
}

function clampPageCount(value) {
  const numeric = Math.floor(Number(value) || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.min(numeric, MAX_SLICES);
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

async function setCaptureStopArmed(tabId, sessionId, armed) {
  const frames = await getFrames(tabId);
  const message = {
    type: armed ? "XF_ARM_CAPTURE_STOP" : "XF_DISARM_CAPTURE_STOP",
    sessionId
  };
  await Promise.allSettled(frames.map((frame) => sendToFrame(tabId, frame.frameId, message)));
}

async function chooseCaptureFrame(tabId, captureProfile = "default") {
  const frames = await getFrames(tabId);
  const measured = [];

  for (const frame of frames) {
    const measurement = await sendToFrame(tabId, frame.frameId, {
      type: "XF_MEASURE_CAPTURE",
      captureProfile
    }).catch(() => null);
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

  const topFrame = measured.find((frame) => frame.frameId === 0) || null;
  for (const frame of measured) {
    frame.score = adjustCaptureFrameScore(frame, topFrame, captureProfile);
  }

  measured.sort((a, b) => b.score - a.score);
  const selected = measured[0];
  if (!selected) {
    throw new Error("Could not find a scrollable capture target.");
  }
  return selected;
}

function adjustCaptureFrameScore(frame, topFrame, captureProfile) {
  let score = frame.score;
  const hasPageCapture = frame.target?.captureStrategy === "pages";
  if (isEmbeddedDocumentPreviewFrame(frame, topFrame, captureProfile)) {
    score *= 0.04;
  }
  if (hasPageCapture) {
    score *= frame.frameId === 0 ? 8 : 16;
  }
  return score;
}

function isEmbeddedDocumentPreviewFrame(frame, topFrame, captureProfile) {
  if (!frame || frame.frameId === 0 || !topFrame) {
    return false;
  }
  if (captureProfile !== "auto" && captureProfile !== "default") {
    return false;
  }

  const topUrl = `${topFrame.url || ""} ${topFrame.target?.frameUrl || ""}`.toLowerCase();
  if (!/(^|\.|\/\/)(feishu|larksuite)\./i.test(topUrl) || !/\/docx?\//i.test(topUrl)) {
    return false;
  }

  const frameUrl = `${frame.url || ""} ${frame.target?.frameUrl || ""}`.toLowerCase();
  const looksLikePreviewFrame = /preview_tpl|internal-api-drive-stream|tpl_id=pdf|mount_point=docx_file|source=docx_file|disablescrollbar/.test(frameUrl);
  if (!looksLikePreviewFrame) {
    return false;
  }

  const topWidth = Number(topFrame.target?.visibleWidth) || Number(topFrame.offset?.width) || 0;
  const topHeight = Number(topFrame.target?.visibleHeight) || Number(topFrame.offset?.height) || 0;
  const frameWidth = Number(frame.offset?.width) || Number(frame.target?.visibleWidth) || 0;
  const frameHeight = Number(frame.offset?.height) || Number(frame.target?.visibleHeight) || 0;
  const coverage = topWidth > 0 && topHeight > 0
    ? (frameWidth * frameHeight) / (topWidth * topHeight)
    : 0;

  return coverage > 0 && coverage < 0.34;
}

async function getFrames(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => null);
  return frames?.length ? frames : [{ frameId: 0, parentFrameId: -1, url: "" }];
}

async function locateFrameOffset(tabId, frames, frameId) {
  let current = frames.find((frame) => frame.frameId === frameId);
  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;

  while (current && current.frameId !== 0) {
    const parent = frames.find((frame) => frame.frameId === current.parentFrameId);
    if (!parent) {
      return { x: 0, y: 0, width: 0, height: 0, ok: false };
    }

    const list = await sendToFrame(tabId, parent.frameId, { type: "XF_LIST_IFRAMES" }).catch(() => null);
    const match = findMatchingIframe(list?.frames || [], current);
    if (!match) {
      return { x: 0, y: 0, width: 0, height: 0, ok: false };
    }

    if (!width || !height) {
      width = Number(match.rect?.width) || 0;
      height = Number(match.rect?.height) || 0;
    }
    x += match.rect.left;
    y += match.rect.top;
    current = parent;
  }

  return { x, y, width, height, ok: true };
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
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#0b5cff" }).catch(() => {});
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
    captureProfile: payload.target?.captureProfile || "default",
    captureStrategy: payload.target?.captureStrategy || "scroll",
    pageCount: payload.target?.pageCount || null,
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

function formatCaptureErrorForUser(error) {
  const message = error?.message || String(error);
  const oldPageNavigationMatch = message.match(/PPT page navigation landed on page (\d+) instead of (\d+)/i);
  if (oldPageNavigationMatch) {
    return [
      backgroundT("截图未完成：PPT 预览器没有成功跳到目标页。"),
      backgroundT(`当前停在第 ${oldPageNavigationMatch[1]} 页，目标是第 ${oldPageNavigationMatch[2]} 页。`),
      backgroundT("可以先点击左侧缩略图切到目标页后重试，或选择“从当前位置捕获”。")
    ].join("\n");
  }

  const pageNavigationMatch = message.match(/PPT 页码跳转失败：目标第\s*(\d+)\s*页，当前仍在(.+?)。/);
  if (pageNavigationMatch) {
    return [
      backgroundT("截图未完成：PPT 预览器没有成功跳到目标页。"),
      backgroundT(`目标是第 ${pageNavigationMatch[1]} 页，当前仍在${pageNavigationMatch[2]}。`),
      backgroundT("可以先点击左侧缩略图切到目标页后重试，或选择“从当前位置捕获”。")
    ].join("\n");
  }

  if (/Chrome does not allow capture scripts/i.test(message)) {
    return backgroundT("当前页面不允许扩展截图。请换到普通网页、飞书文档或 PPT 预览页后再试。");
  }

  return backgroundT(`截图失败：${message}`);
}
