(() => {
  const VERSION = "0.4.0";
  const SCROLL_STRIDE_RATIO = 0.96;
  const STABILITY_SAMPLE_MS = 95;
  const DOCUMENT_STABILITY_SAMPLE_MS = 145;
  const PAGE_CONTENT_READY_TIMEOUT_MS = 1200;
  const DOCUMENT_CONTENT_READY_TIMEOUT_MS = 1800;
  const PRESENTATION_CONTENT_READY_TIMEOUT_MS = 2600;
  const LOCALE_STORAGE_KEY = "xfFullPageCapture:locale";
  let interfaceLocale = "en";

  function normalizeInterfaceLocale(value) {
    return /^zh(?:-|$)/i.test(value || "") ? "zh-CN" : "en";
  }

  const interfaceLocaleReady = Promise.resolve(chrome.storage?.local?.get?.(LOCALE_STORAGE_KEY))
    .then((stored) => {
      interfaceLocale = normalizeInterfaceLocale(stored?.[LOCALE_STORAGE_KEY]);
    })
    .catch(() => {});

  chrome.storage?.onChanged?.addListener?.((changes, areaName) => {
    if (areaName === "local" && changes?.[LOCALE_STORAGE_KEY]) {
      interfaceLocale = normalizeInterfaceLocale(changes[LOCALE_STORAGE_KEY].newValue);
    }
  });

  function ui(zh, en) {
    return interfaceLocale === "en" ? en : zh;
  }

  if (window.__xfFullPageCaptureVersion === VERSION) {
    return;
  }
  if (typeof window.__xfFullPageCaptureCleanup === "function") {
    window.__xfFullPageCaptureCleanup();
  }
  window.__xfFullPageCaptureVersion = VERSION;

  const state = {
    target: null,
    isWindow: true,
    originalScrollTop: 0,
    originalOverflowAnchor: "",
    originalTargetScrollBehavior: "",
    styleNode: null,
    hiddenNodes: new Map(),
    captureSessionId: "",
    stopRequestSent: false,
    captureProfile: "default",
    targetInfo: null,
    stopKeyHandler: null,
    startPickerCleanup: null,
    startPickerCancel: null,
    startPickerRequested: false,
    startPickerOpening: false,
    startPickerCancelPending: false
  };

  function handleMessage(message, _sender, sendResponse) {
    if (message?.type === "XF_MEASURE_CAPTURE") {
      Promise.resolve().then(() => measureCapture(message)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_PREPARE_CAPTURE") {
      Promise.resolve().then(() => prepareCapture(message)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_PICK_CAPTURE_RANGE" || message?.type === "XF_PICK_START_POSITION") {
      state.startPickerRequested = true;
      Promise.resolve().then(pickCaptureRange).then(sendResponse).catch((error) => {
        state.startPickerRequested = false;
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_GET_CURRENT_SCROLL_POSITION") {
      Promise.resolve().then(() => getCurrentScrollPosition(message.captureProfile)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_SCROLL_TO") {
      Promise.resolve().then(() => scrollToStep(message.step, message.index)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_SCROLL_TO_POSITION") {
      Promise.resolve().then(() => scrollToPosition(message.scrollTop, message.captureProfile, message.target)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_CAPTURE_PAGE_STEP") {
      Promise.resolve().then(() => capturePresentationPageStep(message.pageIndex, message.pageCount)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_RESTORE_CAPTURE") {
      restoreCapture();
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "XF_ARM_CAPTURE_STOP") {
      armCaptureStop(message.sessionId);
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "XF_DISARM_CAPTURE_STOP") {
      disarmCaptureStop(message.sessionId);
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "XF_CANCEL_CAPTURE_RANGE") {
      cancelStartPicker();
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "XF_LIST_IFRAMES") {
      sendResponse({ ok: true, frames: listIframes() });
      return true;
    }

    if (message?.type === "XF_GET_VIEWPORT") {
      sendResponse({ ok: true, viewport: getViewport() });
      return true;
    }

    return false;
  }

  chrome.runtime.onMessage.addListener(handleMessage);
  window.__xfFullPageCaptureCleanup = () => {
    chrome.runtime.onMessage.removeListener(handleMessage);
    cancelStartPicker();
    restoreCapture();
  };

  async function measureCapture(options = {}) {
    const captureProfile = normalizeCaptureProfile(options.captureProfile);
    const targetInfo = findBestScrollTarget(captureProfile);
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    return {
      ok: true,
      target: buildTargetPayload(targetInfo, metrics, captureProfile)
    };
  }

  async function prepareCapture(options = {}) {
    restoreCapture();

    const captureProfile = normalizeCaptureProfile(options.captureProfile);
    const targetInfo = findBestScrollTarget(captureProfile);
    state.target = targetInfo.element;
    state.isWindow = targetInfo.isWindow;
    state.captureProfile = captureProfile;
    state.targetInfo = targetInfo;
    state.originalScrollTop = getScrollTop();
    state.originalOverflowAnchor = document.documentElement.style.overflowAnchor;
    state.originalTargetScrollBehavior = state.target?.style?.scrollBehavior || "";
    document.documentElement.style.overflowAnchor = "none";
    if (state.target?.style) {
      state.target.style.scrollBehavior = "auto";
    }

    state.styleNode = document.createElement("style");
    state.styleNode.id = "xf-fullpage-capture-style";
    state.styleNode.textContent = `
      html {
        scroll-behavior: auto !important;
      }
      *, *::before, *::after {
        scroll-behavior: auto !important;
        animation-play-state: paused !important;
        transition-duration: 0s !important;
      }
    `;
    document.documentElement.appendChild(state.styleNode);

    state.captureSessionId = options.sessionId || "";
    state.stopRequestSent = false;
    if (options.enableKeyStop || options.enableClickStop) {
      installStopKeyListener();
    }

    const metrics = await waitForStableMetrics();
    return {
      ok: true,
      target: buildTargetPayload(targetInfo, metrics, captureProfile)
    };
  }

  async function scrollToStep(step, index) {
    setScrollTop(step.scrollTop);
    updateRepeatedFixedVisibility(index);
    await waitForVisibleContentReady(
      getMetrics().cropRect,
      state.captureProfile === "document" ? DOCUMENT_CONTENT_READY_TIMEOUT_MS : PAGE_CONTENT_READY_TIMEOUT_MS
    );
    const metrics = await waitForStableMetrics();
    const scrollTop = getScrollTop();
    const targetVisibleHeight = Math.min(metrics.visibleHeight, Math.max(0, metrics.totalHeight - scrollTop));
    const isAtEnd = scrollTop + metrics.visibleHeight >= metrics.totalHeight - 2;
    const stride = Math.max(260, Math.floor(metrics.visibleHeight * SCROLL_STRIDE_RATIO));
    const lastTop = Math.max(0, metrics.totalHeight - metrics.visibleHeight);
    const nextScrollTop = isAtEnd ? scrollTop : Math.min(scrollTop + stride, lastTop);

    return {
      ok: true,
      scrollTop,
      nextScrollTop,
      isAtEnd,
      totalHeight: metrics.totalHeight,
      cropRect: metrics.cropRect,
      viewport: getViewport(),
      targetVisibleHeight
    };
  }

  async function scrollToPosition(scrollTop, captureProfile = "default", targetHint = null) {
    const requestedTop = Math.max(0, Math.floor(Number(scrollTop) || 0));
    const targetInfo = findScrollTargetForPosition(normalizeCaptureProfile(captureProfile), targetHint, requestedTop);
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const maxTop = Math.max(0, metrics.totalHeight - metrics.visibleHeight);
    const nextTop = clamp(requestedTop, 0, maxTop);
    setScrollTopFor(targetInfo, nextTop);
    await waitForPaint();
    await waitForPaint();
    return {
      ok: true,
      scrollTop: getScrollTopFor(targetInfo),
      totalHeight: metrics.totalHeight
    };
  }

  async function getCurrentScrollPosition(captureProfile = "default") {
    const targetInfo = findBestScrollTarget(normalizeCaptureProfile(captureProfile));
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const scrollTop = getScrollTopFor(targetInfo);
    const pageInfo = targetInfo.captureStrategy === "pages" ? readPresentationPageInfo(targetInfo) : null;
    return {
      ok: true,
      scrollTop,
      pageIndex: Number.isFinite(Number(pageInfo?.currentIndex)) ? pageInfo.currentIndex : null,
      pageCount: Number.isFinite(Number(pageInfo?.pageCount)) ? pageInfo.pageCount : null,
      maxScrollTop: Math.max(0, metrics.totalHeight - metrics.visibleHeight),
      target: buildTargetPayload(targetInfo, metrics, normalizeCaptureProfile(captureProfile))
    };
  }

  async function capturePresentationPageStep(pageIndex, pageCountHint) {
    const targetInfo = state.targetInfo?.captureStrategy === "pages"
      ? state.targetInfo
      : findBestScrollTarget("auto");
    if (targetInfo.captureStrategy !== "pages") {
      throw new Error("No presentation page viewer was detected.");
    }

    const pageInfo = readPresentationPageInfo(targetInfo);
    const pageCount = Math.max(1, Math.floor(Number(pageCountHint) || Number(pageInfo.pageCount) || 1));
    const nextIndex = clamp(Math.floor(Number(pageIndex) || 0), 0, pageCount - 1);
    await navigatePresentationToPage(targetInfo, nextIndex, pageCount);
    await waitForPresentationStable(targetInfo);

    const pageImage = await capturePresentationPageImage(targetInfo, nextIndex);
    if (pageImage) {
      const currentInfo = readPresentationPageInfo(targetInfo);
      const currentIndex = Number.isFinite(Number(currentInfo.currentIndex)) ? currentInfo.currentIndex : nextIndex;
      return {
        ok: true,
        pageIndex: currentIndex,
        pageNumber: currentIndex + 1,
        pageCount,
        scrollTop: currentIndex * pageImage.height,
        absoluteScrollTop: getScrollTopFor(targetInfo),
        logicalHeight: pageImage.height,
        targetVisibleHeight: pageImage.height,
        totalHeight: pageCount * pageImage.height,
        cropRect: {
          x: 0,
          y: 0,
          width: pageImage.width,
          height: pageImage.height
        },
        viewport: {
          width: pageImage.width,
          height: pageImage.height,
          devicePixelRatio: 1
        },
        dataUrl: pageImage.dataUrl,
        captureSource: pageImage.source,
        isAtEnd: currentIndex >= pageCount - 1,
        nextPageIndex: currentIndex + 1
      };
    }

    let cropRect = findPresentationPageRect(targetInfo) || getMetricsFor(targetInfo.element, targetInfo.isWindow).cropRect;
    await waitForVisibleContentReady(cropRect, PRESENTATION_CONTENT_READY_TIMEOUT_MS);
    await waitForPresentationStable(targetInfo);
    cropRect = findPresentationPageRect(targetInfo) || cropRect;
    hidePresentationObstructions(cropRect);
    await waitForPaint();

    const currentInfo = readPresentationPageInfo(targetInfo);
    const currentIndex = Number.isFinite(Number(currentInfo.currentIndex)) ? currentInfo.currentIndex : nextIndex;
    const logicalHeight = Math.max(1, Math.round(cropRect.height));

    return {
      ok: true,
      pageIndex: currentIndex,
      pageNumber: currentIndex + 1,
      pageCount,
      scrollTop: currentIndex * logicalHeight,
      absoluteScrollTop: getScrollTopFor(targetInfo),
      logicalHeight,
      targetVisibleHeight: logicalHeight,
      totalHeight: pageCount * logicalHeight,
      cropRect,
      viewport: getViewport(),
      isAtEnd: currentIndex >= pageCount - 1,
      nextPageIndex: currentIndex + 1
    };
  }

  function restoreCapture() {
    removeStopKeyListener();
    cancelStartPicker();

    for (const [node, previous] of state.hiddenNodes) {
      node.style.visibility = previous.visibility;
    }
    state.hiddenNodes.clear();

    if (state.target) {
      setScrollTop(state.originalScrollTop);
      if (state.target.style) {
        state.target.style.scrollBehavior = state.originalTargetScrollBehavior || "";
      }
    }
    if (state.styleNode?.isConnected) {
      state.styleNode.remove();
    }
    document.documentElement.style.overflowAnchor = state.originalOverflowAnchor || "";

    state.target = null;
    state.isWindow = true;
    state.originalScrollTop = 0;
    state.originalOverflowAnchor = "";
    state.originalTargetScrollBehavior = "";
    state.styleNode = null;
    state.captureSessionId = "";
    state.stopRequestSent = false;
    state.captureProfile = "default";
    state.targetInfo = null;
  }

  async function pickCaptureRange() {
    resetStartPicker({ preservePendingCancel: true });
    state.startPickerRequested = false;
    state.startPickerOpening = true;
    await interfaceLocaleReady;
    state.startPickerOpening = false;
    if (state.startPickerCancelPending) {
      state.startPickerCancelPending = false;
      return { ok: true, cancelled: true };
    }

    const targetInfo = findBestScrollTarget();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      const controlsLayer = document.createElement("div");
      const line = document.createElement("div");
      const startLine = document.createElement("div");
      const selectionBand = document.createElement("div");
      const selectionSize = document.createElement("div");
      const label = document.createElement("div");
      const controls = document.createElement("div");
      const startButton = document.createElement("button");
      const endButton = document.createElement("button");
      const toEndButton = document.createElement("button");
      const cancelButton = document.createElement("button");
      let startScrollTop = null;
      let currentClientY = Math.round(window.innerHeight / 2);
      let pickerFinished = false;

      overlay.id = "xf-fullpage-capture-start-picker";
      overlay.style.cssText = [
        "position: fixed",
        "inset: 0",
        "z-index: 2147483647",
        "pointer-events: none",
        "cursor: crosshair"
      ].join(";");
      controlsLayer.id = "xf-fullpage-capture-start-controls";
      controlsLayer.style.cssText = [
        "position: fixed",
        "inset: auto auto 16px 16px",
        "z-index: 2147483647",
        "pointer-events: auto"
      ].join(";");
      line.style.cssText = [
        "position: fixed",
        "left: 0",
        "right: 0",
        "top: 50%",
        "height: 0",
        "border-top: 2px solid #0b5cff",
        "box-shadow: 0 0 0 1px rgba(255,255,255,0.72)"
      ].join(";");
      startLine.style.cssText = [
        "position: fixed",
        "left: 0",
        "right: 0",
        "top: 50%",
        "height: 0",
        "border-top: 2px solid #2563eb",
        "box-shadow: 0 0 0 1px rgba(255,255,255,0.72)",
        "display: none"
      ].join(";");
      selectionBand.style.cssText = [
        "position: fixed",
        "display: none",
        "z-index: -1",
        "border: 1px solid rgba(11, 92, 255, 0.58)",
        "background: rgba(11, 92, 255, 0.11)",
        "box-shadow: inset 0 0 0 1px rgba(255,255,255,0.5)",
        "pointer-events: none"
      ].join(";");
      selectionSize.style.cssText = [
        "position: fixed",
        "display: none",
        "padding: 5px 8px",
        "border: 1px solid rgba(11, 92, 255, 0.3)",
        "border-radius: 6px",
        "background: rgba(255, 255, 255, 0.96)",
        "color: #17427a",
        "font: 700 12px/1.25 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        "box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16)",
        "pointer-events: none"
      ].join(";");
      label.textContent = ui(
        "移动鼠标定位，点击页面正文或“标记起点”；Esc 取消",
        "Move the pointer, click the page or Mark start; press Esc to cancel"
      );
      label.style.cssText = [
        "position: fixed",
        "right: 16px",
        "top: calc(50% + 10px)",
        "padding: 7px 10px",
        "border-radius: 7px",
        "background: rgba(11, 92, 255, 0.96)",
        "color: #fff",
        "font: 12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        "box-shadow: 0 8px 24px rgba(15, 23, 42, 0.24)"
      ].join(";");
      controls.style.cssText = [
        "display: flex",
        "flex-wrap: wrap",
        "gap: 8px",
        "max-width: min(520px, calc(100vw - 32px))",
        "padding: 10px",
        "border: 1px solid rgba(11, 92, 255, 0.28)",
        "border-radius: 8px",
        "background: rgba(255, 255, 255, 0.96)",
        "box-shadow: 0 12px 34px rgba(15, 23, 42, 0.22)",
        "pointer-events: auto"
      ].join(";");
      for (const button of [startButton, endButton, toEndButton, cancelButton]) {
        button.type = "button";
        button.style.cssText = [
          "min-height: 32px",
          "border: 1px solid #0b5cff",
          "border-radius: 7px",
          "padding: 0 10px",
          "background: #0b5cff",
          "color: #fff",
          "font: 12px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          "font-weight: 700",
          "cursor: pointer"
        ].join(";");
        button.style.setProperty("pointer-events", "auto", "important");
      }
      startButton.textContent = ui("标记起点", "Mark start");
      endButton.textContent = ui("标记终点", "Mark end");
      toEndButton.textContent = ui("截到页面结束", "Capture to page end");
      cancelButton.textContent = ui("取消", "Cancel");
      endButton.disabled = true;
      toEndButton.disabled = true;
      cancelButton.style.background = "#fff";
      cancelButton.style.color = "#0b5cff";
      controls.append(startButton, endButton, toEndButton, cancelButton);
      controlsLayer.appendChild(controls);
      overlay.append(selectionBand, startLine, line, label, selectionSize);
      document.documentElement.appendChild(overlay);
      document.documentElement.appendChild(controlsLayer);

      const stopControlEvent = (event) => {
        event.stopPropagation();
      };

      const cleanup = () => {
        document.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("pointerdown", onPagePointerDown, true);
        window.removeEventListener("keydown", onKeydown, true);
        document.removeEventListener("scroll", updateStartLinePosition, true);
        controlsLayer.removeEventListener("pointerdown", stopControlEvent);
        controlsLayer.removeEventListener("pointerup", stopControlEvent);
        controlsLayer.removeEventListener("click", stopControlEvent);
        if (overlay.isConnected) {
          overlay.remove();
        }
        if (controlsLayer.isConnected) {
          controlsLayer.remove();
        }
        if (state.startPickerCleanup === cleanup) {
          state.startPickerCleanup = null;
        }
        state.startPickerCancel = null;
      };

      const finish = (payload) => {
        if (pickerFinished) {
          return;
        }
        pickerFinished = true;
        cleanup();
        resolve(payload);
      };

      const onPointerMove = (event) => {
        if (controlsLayer.contains(event.target)) {
          return;
        }
        currentClientY = clamp(event.clientY, 0, window.innerHeight);
        updateGuidePosition();
      };

      const markStart = (event) => {
        stopPickerEvent(event);

        startScrollTop = getPickedScrollTop(targetInfo, currentClientY);
        startButton.disabled = true;
        endButton.disabled = false;
        toEndButton.disabled = false;
        updateStartLinePosition();
        updateSelectionPreview();
        label.textContent = ui(
          "已标记起点。可以滚动页面，再点击页面正文或“标记终点”；按 Enter 截到页面结束，Esc 取消",
          "Start marked. Scroll, then click the page or Mark end; press Enter to capture to the end or Esc to cancel"
        );
      };

      const markEnd = (event) => {
        stopPickerEvent(event);

        const pickedScrollTop = getPickedScrollTop(targetInfo, currentClientY);
        if (startScrollTop === null) {
          label.textContent = ui("请先标记起点。", "Mark a start point first.");
          return;
        }

        if (pickedScrollTop <= startScrollTop + 8) {
          label.textContent = ui(
            "终点要在起点下方。可以继续滚动页面，再点击页面正文或“标记终点”；或按 Enter 截到页面结束",
            "The end must be below the start. Keep scrolling, then click the page or Mark end; or press Enter to capture to the page end"
          );
          return;
        }

        finish({
          ok: true,
          startScrollTop,
          endScrollTop: pickedScrollTop
        });
      };

      const captureToEnd = (event) => {
        stopPickerEvent(event);
        if (startScrollTop === null) {
          label.textContent = ui("请先标记起点。", "Mark a start point first.");
          return;
        }
        finish({
          ok: true,
          startScrollTop,
          endScrollTop: null
        });
      };

      const cancel = (event) => {
        stopPickerEvent(event);
        finish({ ok: true, cancelled: true });
      };

      const onPagePointerDown = (event) => {
        if (event.button !== 0 || controlsLayer.contains(event.target) || isScrollbarInteraction(event, targetInfo)) {
          return;
        }
        currentClientY = clamp(event.clientY, 0, window.innerHeight);
        updateGuidePosition();
        if (startScrollTop === null) {
          markStart(event);
          return;
        }
        markEnd(event);
      };

      const onKeydown = (event) => {
        if ((event.key === " " || event.key === "Spacebar") && startScrollTop === null) {
          event.preventDefault();
          event.stopImmediatePropagation();
          markStart(event);
          return;
        }

        if (event.key === "Enter" && startScrollTop !== null) {
          event.preventDefault();
          event.stopImmediatePropagation();
          finish({
            ok: true,
            startScrollTop,
            endScrollTop: null
          });
          return;
        }

        if (event.key !== "Escape") {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        finish({ ok: true, cancelled: true });
      };

      const activateOnPointer = (button, handler) => {
        button.addEventListener("pointerdown", handler);
        button.addEventListener("click", handler);
        button.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            handler(event);
          }
        });
      };

      const updateGuidePosition = () => {
        line.style.top = `${currentClientY}px`;
        label.style.top = `${Math.min(window.innerHeight - 42, currentClientY + 10)}px`;
        updateSelectionPreview();
      };

      const updateSelectionPreview = () => {
        if (startScrollTop === null) {
          selectionBand.style.display = "none";
          selectionSize.style.display = "none";
          return;
        }
        const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
        const currentScrollTop = getScrollTopFor(targetInfo);
        const pickedScrollTop = getPickedScrollTop(targetInfo, currentClientY);
        const selectedHeight = Math.max(0, Math.round(pickedScrollTop - startScrollTop));
        const startY = metrics.cropRect.y + startScrollTop - currentScrollTop;
        const endY = clamp(currentClientY, metrics.cropRect.y, metrics.cropRect.y + metrics.visibleHeight);
        const visibleTop = clamp(Math.min(startY, endY), metrics.cropRect.y, metrics.cropRect.y + metrics.visibleHeight);
        const visibleBottom = clamp(Math.max(startY, endY), metrics.cropRect.y, metrics.cropRect.y + metrics.visibleHeight);
        const width = Math.max(1, Math.round(metrics.cropRect.width));
        selectionBand.style.left = `${metrics.cropRect.x}px`;
        selectionBand.style.top = `${visibleTop}px`;
        selectionBand.style.width = `${metrics.cropRect.width}px`;
        selectionBand.style.height = `${Math.max(1, visibleBottom - visibleTop)}px`;
        selectionBand.style.display = "block";
        selectionSize.textContent = `${width} × ${selectedHeight} px`;
        selectionSize.style.left = `${Math.min(window.innerWidth - 150, Math.max(8, metrics.cropRect.x + 10))}px`;
        selectionSize.style.top = `${Math.min(window.innerHeight - 36, Math.max(8, endY + 10))}px`;
        selectionSize.style.display = "block";
      };

      function updateStartLinePosition() {
        if (startScrollTop === null) {
          startLine.style.display = "none";
          updateSelectionPreview();
          return;
        }
        const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
        const currentScrollTop = getScrollTopFor(targetInfo);
        const y = metrics.cropRect.y + startScrollTop - currentScrollTop;
        if (y < metrics.cropRect.y || y > metrics.cropRect.y + metrics.visibleHeight) {
          startLine.style.display = "none";
          updateSelectionPreview();
          return;
        }
        startLine.style.top = `${y}px`;
        startLine.style.display = "block";
        updateSelectionPreview();
      }

      state.startPickerCleanup = cleanup;
      state.startPickerCancel = () => finish({ ok: true, cancelled: true });
      updateGuidePosition();
      controlsLayer.addEventListener("pointerdown", stopControlEvent);
      controlsLayer.addEventListener("pointerup", stopControlEvent);
      controlsLayer.addEventListener("click", stopControlEvent);
      activateOnPointer(startButton, markStart);
      activateOnPointer(endButton, markEnd);
      activateOnPointer(toEndButton, captureToEnd);
      activateOnPointer(cancelButton, cancel);
      document.addEventListener("pointermove", onPointerMove, true);
      document.addEventListener("pointerdown", onPagePointerDown, true);
      window.addEventListener("keydown", onKeydown, true);
      document.addEventListener("scroll", updateStartLinePosition, true);
      requestAnimationFrame(() => {
        try {
          startButton.focus({ preventScroll: true });
        } catch (_error) {
          startButton.focus();
        }
      });
    });
  }

  function stopPickerEvent(event) {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
  }

  function isScrollbarInteraction(event, targetInfo) {
    const scrollbarGutter = 24;
    if (event.clientX >= window.innerWidth - scrollbarGutter || event.clientY >= window.innerHeight - scrollbarGutter) {
      return true;
    }

    if (!targetInfo?.isWindow) {
      const metrics = getMetricsFor(targetInfo.element, false);
      const nearRightEdge = event.clientX >= metrics.cropRect.x + metrics.cropRect.width - scrollbarGutter
        && event.clientX <= metrics.cropRect.x + metrics.cropRect.width + 2;
      const nearBottomEdge = event.clientY >= metrics.cropRect.y + metrics.cropRect.height - scrollbarGutter
        && event.clientY <= metrics.cropRect.y + metrics.cropRect.height + 2;
      if ((nearRightEdge || nearBottomEdge) && targetInfo.element.contains(event.target)) {
        return true;
      }
    }

    return false;
  }

  function getPickedScrollTop(targetInfo, clientY) {
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const currentScrollTop = targetInfo.isWindow
      ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0)
      : targetInfo.element.scrollTop;
    const viewportOffset = targetInfo.isWindow
      ? clientY
      : clamp(clientY, metrics.cropRect.y, metrics.cropRect.y + metrics.cropRect.height) - metrics.cropRect.y;
    const maxBottom = Math.max(0, metrics.totalHeight);
    return Math.round(clamp(currentScrollTop + viewportOffset, 0, maxBottom));
  }

  function cancelStartPicker() {
    if (typeof state.startPickerCancel === "function") {
      state.startPickerCancel();
      return;
    }
    if (typeof state.startPickerCleanup === "function") {
      const cleanup = state.startPickerCleanup;
      state.startPickerCleanup = null;
      cleanup();
      return;
    }
    if (state.startPickerRequested || state.startPickerOpening) {
      state.startPickerCancelPending = true;
    }
  }

  function resetStartPicker(options = {}) {
    const pendingCancel = options.preservePendingCancel && state.startPickerCancelPending;
    if (typeof state.startPickerCancel === "function") {
      state.startPickerCancel();
    } else if (typeof state.startPickerCleanup === "function") {
      const cleanup = state.startPickerCleanup;
      state.startPickerCleanup = null;
      cleanup();
    }
    state.startPickerRequested = false;
    state.startPickerOpening = false;
    state.startPickerCancelPending = Boolean(pendingCancel);
  }

  function armCaptureStop(sessionId) {
    const nextSessionId = String(sessionId || "");
    if (!nextSessionId) {
      return;
    }
    state.captureSessionId = nextSessionId;
    state.stopRequestSent = false;
    installStopKeyListener();
  }

  function disarmCaptureStop(sessionId) {
    if (sessionId && state.captureSessionId && sessionId !== state.captureSessionId) {
      return;
    }
    removeStopKeyListener();
    state.captureSessionId = "";
    state.stopRequestSent = false;
  }

  function installStopKeyListener() {
    removeStopKeyListener();
    state.stopKeyHandler = (event) => {
      if (!state.captureSessionId || event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.stopRequestSent) {
        return;
      }
      state.stopRequestSent = true;
      Promise.resolve(chrome.runtime.sendMessage({
          type: "XF_USER_STOP_CAPTURE",
          sessionId: state.captureSessionId
        }))
        .catch((error) => {
          state.stopRequestSent = false;
          console.warn("Could not request capture stop.", error);
        });
    };
    window.addEventListener("keydown", state.stopKeyHandler, true);
  }

  function removeStopKeyListener() {
    if (!state.stopKeyHandler) {
      return;
    }
    window.removeEventListener("keydown", state.stopKeyHandler, true);
    state.stopKeyHandler = null;
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

  function findBestScrollTarget(captureProfile = "default") {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const windowScore = scoreWindow(scrollingElement);
    const candidates = collectScrollableCandidates();

    if (captureProfile === "auto") {
      const presentationTarget = choosePresentationCaptureTarget(scrollingElement, windowScore, candidates);
      if (presentationTarget) {
        return presentationTarget;
      }
      const documentTarget = chooseDocumentCaptureTarget(scrollingElement, windowScore, candidates);
      if (documentTarget) {
        return documentTarget;
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (best && best.score > windowScore * 1.05) {
      return best;
    }

    return {
      isWindow: true,
      element: scrollingElement,
      label: "Page window",
      score: windowScore
    };
  }

  function findScrollTargetForPosition(captureProfile = "default", targetHint = null, scrollTop = 0) {
    const defaultTarget = findBestScrollTarget(captureProfile);
    if (canTargetReachScrollTop(defaultTarget, scrollTop)) {
      return defaultTarget;
    }

    const scrollingElement = document.scrollingElement || document.documentElement;
    const windowTarget = {
      isWindow: true,
      element: scrollingElement,
      label: "Page window",
      score: scoreWindow(scrollingElement)
    };
    if (targetHint?.mode === "window" && canTargetReachScrollTop(windowTarget, scrollTop)) {
      return windowTarget;
    }

    const candidates = collectScrollableCandidates()
      .filter((candidate) => canTargetReachScrollTop(candidate, scrollTop))
      .sort((a, b) => scoreResumeCandidate(b, targetHint) - scoreResumeCandidate(a, targetHint));
    if (candidates[0]) {
      return candidates[0];
    }

    if (canTargetReachScrollTop(windowTarget, scrollTop)) {
      return windowTarget;
    }

    return defaultTarget;
  }

  function canTargetReachScrollTop(targetInfo, scrollTop) {
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const maxTop = Math.max(0, metrics.totalHeight - metrics.visibleHeight);
    return maxTop >= Math.max(0, scrollTop - 8);
  }

  function scoreResumeCandidate(candidate, targetHint = null) {
    let score = candidate.score || 0;
    if (targetHint?.mode === "inner-scroll" && !candidate.isWindow) {
      score *= 1.25;
    }
    if (targetHint?.label && candidate.label === targetHint.label) {
      score *= 1.5;
    }
    const expectedHeight = Number(targetHint?.fullTotalHeight || targetHint?.totalHeight);
    if (Number.isFinite(expectedHeight) && expectedHeight > 0) {
      const metrics = getMetricsFor(candidate.element, candidate.isWindow);
      const diffRatio = Math.abs(metrics.totalHeight - expectedHeight) / Math.max(expectedHeight, 1);
      score *= Math.max(0.35, 1 - Math.min(diffRatio, 0.65));
    }
    return score;
  }

  function collectScrollableCandidates() {
    const candidates = [];

    for (const element of document.body?.querySelectorAll("*") || []) {
      const candidate = buildScrollableCandidate(element);
      if (candidate) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  function buildScrollableCandidate(element) {
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    if (!/(auto|scroll|overlay)/.test(overflowY)) {
      return null;
    }
    if (element.scrollHeight - element.clientHeight < 220) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 320 || rect.height < 260) {
      return null;
    }
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return null;
    }
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    if (visibleHeight <= 0 || visibleWidth <= 0) {
      return null;
    }
    const scrollableRatio = element.scrollHeight / Math.max(element.clientHeight, 1);
    const viewportCoverage = (visibleHeight * visibleWidth) / Math.max(window.innerWidth * window.innerHeight, 1);
    const score = element.scrollHeight * visibleWidth * Math.min(scrollableRatio, 10) * Math.min(Math.max(viewportCoverage, 0.15), 1);
    return {
      element,
      rect,
      visibleHeight,
      visibleWidth,
      viewportCoverage,
      scrollableRatio,
      score,
      label: labelFor(element),
      isWindow: false
    };
  }

  function choosePresentationCaptureTarget(scrollingElement, windowScore, candidates) {
    const pageInfo = readPresentationPageInfo();
    const hasStrongPageSignal = Number.isFinite(pageInfo.pageCount) && pageInfo.pageCount > 1;
    if (!hasStrongPageSignal) {
      return null;
    }

    const pageSignal = getPresentationPageSignal(pageInfo);
    if (pageSignal <= 0) {
      return null;
    }

    const pdfJsTarget = choosePdfJsPresentationTarget(scrollingElement, windowScore, candidates, pageInfo);
    if (pdfJsTarget) {
      return pdfJsTarget;
    }

    const viewerContext = getPresentationViewerContext(scrollingElement, windowScore, pageSignal);
    if (!viewerContext.canCapturePages) {
      return null;
    }

    const scored = candidates.map((candidate) => {
      const signal = scorePresentationCandidate(candidate);
      let score = candidate.score;

      score *= 1 + Math.min(signal.positive, 8) * 0.5;
      if (candidate.rect.left < 220 && candidate.rect.width < 260) {
        score *= 0.08;
      }
      if (signal.negative) {
        score *= Math.max(0.16, 1 - signal.negative * 0.22);
      }
      if (candidate.rect.width >= window.innerWidth * 0.45 && candidate.rect.height >= window.innerHeight * 0.45) {
        score *= 1.32;
      }

      return {
        ...candidate,
        presentationSignal: signal.positive,
        presentationScore: score,
        pageCount: pageInfo.pageCount,
        currentPageIndex: pageInfo.currentIndex,
        label: signal.label || candidate.label
      };
    }).filter((candidate) => isPresentationViewerCandidate(candidate, viewerContext, pageSignal));

    scored.sort((a, b) => b.presentationScore - a.presentationScore);
    const best = scored.find((candidate) => candidate.rect.left >= 180 || candidate.rect.width >= window.innerWidth * 0.46);

    if (best && hasStrongPageSignal && best.presentationScore > windowScore * 0.35) {
      return {
        ...best,
        score: best.presentationScore,
        label: `PPT pages: ${best.label}`,
        captureProfile: "auto",
        captureStrategy: "pages",
        pageCount: pageInfo.pageCount,
        currentPageIndex: pageInfo.currentIndex
      };
    }

    const slideRect = findPresentationPageRect({
      isWindow: true,
      element: scrollingElement,
      label: "Page window",
        score: windowScore
      });
    if (hasStrongPageSignal && slideRect && isPresentationSlideContext(slideRect, viewerContext, pageSignal)) {
      return {
        isWindow: true,
        element: scrollingElement,
        label: "PPT pages: page window",
        score: windowScore * (1 + Math.min(pageSignal, 6) * 0.25),
        captureProfile: "auto",
        captureStrategy: "pages",
        pageCount: pageInfo.pageCount,
        currentPageIndex: pageInfo.currentIndex
      };
    }

    return null;
  }

  function choosePdfJsPresentationTarget(scrollingElement, windowScore, candidates, pageInfo) {
    if (!isPdfJsViewerContext()) {
      return null;
    }

    const viewer = document.querySelector("#viewerContainer, .viewerContainer, #viewer, .pdfViewer");
    const candidate = candidates.find((item) => item.element === viewer)
      || candidates.find((item) => /viewercontainer|pdfviewer|pdf.js|pdfjs/.test(descriptorFor(item.element, 2)));
    const targetInfo = candidate || {
      isWindow: true,
      element: scrollingElement,
      label: "PDF.js page window",
      score: windowScore
    };
    const slideRect = findPresentationPageRect(targetInfo);
    if (!slideRect) {
      return null;
    }

    return {
      ...targetInfo,
      score: Math.max(targetInfo.score || 0, windowScore) * 2.4,
      label: `PPT pages: ${targetInfo.label || labelFor(targetInfo.element)}`,
      captureProfile: "auto",
      captureStrategy: "pages",
      pageCount: pageInfo.pageCount,
      currentPageIndex: pageInfo.currentIndex
    };
  }

  function getPresentationViewerContext(scrollingElement, windowScore, pageSignal) {
    const pageWindow = {
      isWindow: true,
      element: scrollingElement,
      label: "Page window",
      score: windowScore
    };
    const slideRect = findPresentationPageRect(pageWindow);
    const slideCoverage = rectViewportCoverage(slideRect);
    const thumbnailRail = findThumbnailRail();
    const thumbnailCount = thumbnailRail ? collectPresentationThumbnails(thumbnailRail).length : 0;
    const hasThumbnailRail = thumbnailCount >= 3;
    const hasPresentationIdentity = hasPresentationIdentitySignal();
    const embeddedDocxPreview = isEmbeddedDocxAttachmentPreviewContext();
    const hasDominantSlide = isDominantPresentationSlide(slideRect, slideCoverage);
    const canCapturePages = (
      hasDominantSlide
      || (hasThumbnailRail && (slideCoverage >= 0.08 || hasPresentationIdentity))
      || (hasPresentationIdentity && pageSignal >= 5 && slideCoverage >= 0.08)
    ) && !(embeddedDocxPreview && !hasDominantSlide && !hasPresentationIdentity && !hasThumbnailRail);

    return {
      slideRect,
      slideCoverage,
      hasThumbnailRail,
      hasPresentationIdentity,
      embeddedDocxPreview,
      hasDominantSlide,
      canCapturePages
    };
  }

  function isPresentationViewerCandidate(candidate, context, pageSignal) {
    if (!candidate) {
      return false;
    }
    if (candidate.presentationSignal <= 0 && pageSignal < 4) {
      return false;
    }
    if (context.embeddedDocxPreview && !context.hasPresentationIdentity && !context.hasThumbnailRail) {
      if (context.hasDominantSlide) {
        return true;
      }
      return false;
    }

    const candidateSlide = findPresentationPageRect(candidate);
    const candidateCoverage = rectViewportCoverage(candidateSlide);
    return candidate.presentationSignal >= 4
      || context.hasDominantSlide
      || context.hasThumbnailRail
      || candidateCoverage >= 0.14
      || (context.hasPresentationIdentity && candidateCoverage >= 0.08);
  }

  function isPresentationSlideContext(slideRect, context, pageSignal) {
    if (!slideRect) {
      return false;
    }
    if (context.embeddedDocxPreview && !context.hasPresentationIdentity && !context.hasThumbnailRail) {
      return context.hasDominantSlide;
    }
    return isDominantPresentationSlide(slideRect, rectViewportCoverage(slideRect))
      || context.hasThumbnailRail
      || (context.hasPresentationIdentity && pageSignal >= 5);
  }

  function isDominantPresentationSlide(rect, coverage = rectViewportCoverage(rect)) {
    return Boolean(rect)
      && coverage >= 0.14
      && rect.width >= window.innerWidth * 0.42
      && rect.height >= window.innerHeight * 0.3;
  }

  function hasPresentationIdentitySignal() {
    const text = [
      location.href,
      document.title || "",
      document.body?.innerText?.slice(0, 12000) || ""
    ].join("\n");
    return /pptx?|powerpoint|presentation|slides?|deck|演示文稿|幻灯片|演示/i.test(text);
  }

  function isEmbeddedDocxAttachmentPreviewContext() {
    return /preview_tpl|internal-api-drive-stream|tpl_id=pdf/i.test(location.href)
      && /mount_point=docx_file|source=docx_file|disablescrollbar/i.test(location.href);
  }

  function getPresentationPageSignal(pageInfo) {
    let score = 0;
    if (Number.isFinite(pageInfo.pageCount) && pageInfo.pageCount > 1) {
      score += 4;
    }
    if (/ppt|presentation|slides?|deck|演示|幻灯片/i.test(location.href)) {
      score += 2;
    }
    if (/(^|\.)((feishu|larksuite)\.cn|larksuite\.com)$/i.test(location.hostname)) {
      score += 1;
    }
    const text = document.body?.innerText?.slice(0, 12000) || "";
    if (/ppt|presentation|slides?|幻灯片|演示文稿/i.test(text)) {
      score += 1;
    }
    return score;
  }

  function scorePresentationCandidate(candidate) {
    const descriptor = descriptorFor(candidate.element, 4);
    let positive = 0;
    let negative = scoreTextForNavigationKeywords(descriptor);

    if (/viewer|preview|slide|presentation|ppt|deck|canvas|render|演示|幻灯片|预览/.test(descriptor)) {
      positive += 3;
    }
    if (candidate.viewportCoverage > 0.2 && candidate.rect.left >= 160) {
      positive += 2;
    }
    if (findPresentationPageRect(candidate)) {
      positive += 4;
    }
    if (candidate.rect.left < 220 && candidate.rect.width < 260) {
      negative += 5;
    }

    return {
      positive,
      negative,
      label: positive > 0 ? labelFor(candidate.element) : ""
    };
  }

  function readPresentationPageInfo(targetInfo = null) {
    const pdfInfo = readPdfJsPageInfo();
    if (pdfInfo) {
      return pdfInfo;
    }

    const text = collectPresentationText(targetInfo);
    const matches = [...text.matchAll(/(?:^|[^\d])(\d{1,4})\s*\/\s*(\d{1,4})(?=$|[^\d])/g)]
      .map((match) => ({
        current: Number(match[1]),
        total: Number(match[2])
      }))
      .filter((item) => Number.isFinite(item.current)
        && Number.isFinite(item.total)
        && item.total > 1
        && item.total <= 1000
        && item.current >= 1
        && item.current <= item.total);
    matches.sort((a, b) => b.total - a.total);
    const best = matches[0];
    if (best) {
      return {
        currentIndex: best.current - 1,
        pageCount: best.total
      };
    }

    const thumbnails = collectPresentationThumbnails();
    const selected = thumbnails.find((item) => item.selected);
    return {
      currentIndex: Number.isFinite(selected?.number) ? selected.number - 1 : null,
      pageCount: thumbnails.length > 1 ? thumbnails.length : null
    };
  }

  function readPdfJsPageInfo() {
    if (!isPdfJsViewerContext()) {
      return null;
    }

    const app = window.PDFViewerApplication;
    const viewer = app?.pdfViewer;
    const pageCount = firstFiniteNumber(
      app?.pagesCount,
      viewer?.pagesCount,
      app?.pdfDocument?.numPages,
      viewer?._pages?.length,
      document.querySelector("#numPages")?.textContent?.match(/\d{1,4}/)?.[0],
      getPdfJsDomPageCount()
    );
    const currentPageNumber = firstFiniteNumber(
      app?.page,
      viewer?.currentPageNumber,
      viewer?._currentPageNumber,
      document.querySelector("#pageNumber")?.value,
      document.querySelector("[data-page-number].selected")?.getAttribute("data-page-number"),
      getMostVisiblePdfJsPageNumber()
    );

    if (!Number.isFinite(pageCount) || pageCount <= 1 || pageCount > 1000) {
      return null;
    }

    const currentIndex = Number.isFinite(currentPageNumber)
      ? clamp(Math.floor(currentPageNumber) - 1, 0, pageCount - 1)
      : inferCurrentPdfJsPageIndex(pageCount);

    return {
      currentIndex,
      pageCount
    };
  }

  function getPdfJsDomPageCount() {
    const pages = collectPdfJsPageElements();
    if (pages.length <= 1) {
      return null;
    }
    const maxPageNumber = pages.reduce((max, page) => {
      const pageNumber = getPdfJsPageNumber(page);
      return Number.isFinite(pageNumber) ? Math.max(max, pageNumber) : max;
    }, 0);
    return maxPageNumber > 1 ? maxPageNumber : pages.length;
  }

  function getMostVisiblePdfJsPageNumber() {
    let best = null;
    for (const page of collectPdfJsPageElements()) {
      const pageNumber = getPdfJsPageNumber(page);
      if (!Number.isFinite(pageNumber)) {
        continue;
      }
      const rect = clipRectToViewport(page.getBoundingClientRect());
      const visibleArea = rect.width * rect.height;
      if (visibleArea <= 0) {
        continue;
      }
      if (!best || visibleArea > best.visibleArea) {
        best = { pageNumber, visibleArea };
      }
    }
    return best?.pageNumber || null;
  }

  function collectPdfJsPageElements(root = document.body) {
    const pages = [];
    const seen = new Set();
    const nodes = root?.querySelectorAll("[data-page-number], [id^='pageContainer'], .page") || [];
    for (const node of nodes) {
      if (!isPresentationPageElement(node) || seen.has(node)) {
        continue;
      }
      seen.add(node);
      pages.push(node);
    }
    return pages;
  }

  function getPdfJsPageNumber(page) {
    const value = page?.getAttribute?.("data-page-number")
      || page?.getAttribute?.("data-page-id")
      || (page?.id || "").match(/^pageContainer(\d{1,4})$/i)?.[1]
      || "";
    const pageNumber = Number(value);
    return Number.isFinite(pageNumber) ? pageNumber : null;
  }

  function firstFiniteNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) {
        return number;
      }
    }
    return null;
  }

  function inferCurrentPdfJsPageIndex(pageCount) {
    const pages = collectPdfJsPageElements();
    let best = null;
    for (const page of pages) {
      const rect = clipRectToViewport(page.getBoundingClientRect());
      const visibleArea = rect.width * rect.height;
      if (visibleArea <= 0) {
        continue;
      }
      const pageNumber = getPdfJsPageNumber(page);
      if (!Number.isFinite(pageNumber)) {
        continue;
      }
      if (!best || visibleArea > best.visibleArea) {
        best = { pageNumber, visibleArea };
      }
    }

    if (!best) {
      return null;
    }
    return clamp(best.pageNumber - 1, 0, pageCount - 1);
  }

  function collectPresentationText(targetInfo = null) {
    const nodes = [];
    if (targetInfo?.element) {
      nodes.push(targetInfo.element);
    }
    if (document.body) {
      nodes.push(document.body);
    }
    return nodes
      .map((node) => node.innerText || node.textContent || "")
      .join("\n")
      .slice(0, 24000);
  }

  function findPresentationPageRect(targetInfo = null) {
    const root = targetInfo?.element && !targetInfo.isWindow ? targetInfo.element : document.body;
    const pageInfo = readPresentationPageInfo(targetInfo);
    const currentPage = Number.isFinite(Number(pageInfo.currentIndex))
      ? findPresentationPageElement(pageInfo.currentIndex, targetInfo)
      : null;
    if (currentPage) {
      const rect = clipRectToViewport(currentPage.getBoundingClientRect());
      if (isPresentationPageRect(rect, { allowViewportFilling: true })) {
        return rect;
      }
    }

    const selectors = [
      "canvas",
      "img",
      "svg",
      "video",
      "[data-page-number]",
      "[id^='pageContainer']",
      ".page",
      "[data-page-id]",
      "[data-slide-id]",
      "[data-testid*='slide' i]",
      "[data-testid*='presentation' i]",
      "[class*='slide' i]",
      "[class*='ppt' i]",
      "[class*='presentation' i]",
      "[class*='page' i]"
    ].join(",");
    const candidates = [];
    for (const node of root?.querySelectorAll(selectors) || []) {
      const rect = clipRectToViewport(node.getBoundingClientRect());
      if (!isPresentationPageRect(rect, { allowViewportFilling: isPresentationPageElement(node) || isPdfJsViewerContext() })) {
        continue;
      }
      const descriptor = descriptorFor(node, 2);
      const aspect = rect.width / Math.max(rect.height, 1);
      const area = rect.width * rect.height;
      let score = area;
      if (/slide|presentation|ppt|page|canvas|image|img|svg|幻灯片|演示/.test(descriptor)) {
        score *= 1.4;
      }
      if (aspect >= 1.25 && aspect <= 2.05) {
        score *= 1.3;
      }
      if (rect.left < 220) {
        score *= 0.05;
      }
      candidates.push({ rect, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.rect || null;
  }

  function findPresentationPageElement(pageIndex, targetInfo = null) {
    const root = targetInfo?.element && !targetInfo.isWindow ? targetInfo.element : document.body;
    const pageNumber = Math.floor(Number(pageIndex)) + 1;
    if (!root || !Number.isFinite(pageNumber) || pageNumber < 1) {
      return null;
    }

    const exactSelectors = [
      `[data-page-number="${pageNumber}"]`,
      `[data-page-id="${pageNumber}"]`,
      `#pageContainer${pageNumber}`
    ].join(",");
    const exact = root.querySelector(exactSelectors);
    if (exact && isPresentationPageElement(exact)) {
      return exact;
    }

    const candidates = Array.from(root.querySelectorAll("[data-page-number], [data-page-id], [id^='pageContainer'], .page"));
    return candidates.find((node) => {
      if (!isPresentationPageElement(node)) {
        return false;
      }
      const value = node.getAttribute("data-page-number")
        || node.getAttribute("data-page-id")
        || (node.id || "").match(/^pageContainer(\d{1,4})$/i)?.[1]
        || "";
      return Number(value) === pageNumber;
    }) || null;
  }

  async function capturePresentationPageImage(targetInfo, pageIndex) {
    if (!isPdfJsViewerContext()) {
      return null;
    }

    const page = await waitForPdfJsPageElement(pageIndex, targetInfo)
      || findPresentationPageElement(pageIndex, targetInfo);
    if (!page) {
      return null;
    }

    const canvas = await waitForPresentationPageCanvas(page);
    if (!canvas) {
      return null;
    }

    return copyCanvasToPageImage(canvas);
  }

  async function waitForPresentationPageCanvas(page) {
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const canvas = findBestPresentationPageCanvas(page);
      if (canvas) {
        return canvas;
      }
      await sleep(120 + attempt * 45);
      await waitForPaint();
    }
    return null;
  }

  function findBestPresentationPageCanvas(page) {
    const canvases = Array.from(page?.querySelectorAll?.("canvas") || [])
      .filter((canvas) => canvas.width >= 360 && canvas.height >= 220)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return canvases[0] || null;
  }

  function copyCanvasToPageImage(canvas) {
    try {
      const width = Math.max(1, Math.round(canvas.width));
      const height = Math.max(1, Math.round(canvas.height));
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const context = output.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(canvas, 0, 0, width, height);
      return {
        dataUrl: output.toDataURL("image/png"),
        width,
        height,
        source: "page-canvas"
      };
    } catch (_error) {
      return null;
    }
  }

  function isPresentationPageElement(node) {
    if (!node?.matches) {
      return false;
    }
    return node.matches("[data-page-number], [data-page-id], [id^='pageContainer']")
      || /\bpage\b|pagecontainer|pdfviewer|canvaswrapper|textlayer/.test(descriptorFor(node, 1));
  }

  function isPdfJsViewerContext() {
    const text = [
      location.href,
      document.title || "",
      document.body?.id || "",
      document.body?.className || ""
    ].join(" ").toLowerCase();
    return /pdf\.js|pdfjs|viewercontainer|pdfviewer|preview_tpl|tpl_id=pdf|internal-api-drive-stream/.test(text);
  }

  function isPresentationPageRect(rect, options = {}) {
    if (!rect || rect.width < 360 || rect.height < 220) {
      return false;
    }
    if (rect.right <= 240 || rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return false;
    }
    const aspect = rect.width / Math.max(rect.height, 1);
    if (aspect < 0.65 || aspect > 2.35) {
      return false;
    }
    if (!options.allowViewportFilling && rect.width > window.innerWidth * 0.96 && rect.height > window.innerHeight * 0.92) {
      return false;
    }
    return true;
  }

  function rectViewportCoverage(rect) {
    if (!rect) {
      return 0;
    }
    return (rect.width * rect.height) / Math.max(window.innerWidth * window.innerHeight, 1);
  }

  async function navigatePresentationToPage(targetInfo, pageIndex, pageCount) {
    if (await navigatePdfJsToPage(targetInfo, pageIndex)) {
      return;
    }

    if (await scrollPresentationPageIntoView(targetInfo, pageIndex)) {
      return;
    }

    if (await clickPresentationThumbnail(pageIndex)) {
      return;
    }

    if (await scrollPresentationByEstimatedOffset(targetInfo, pageIndex, pageCount)) {
      return;
    }

    throw createPresentationNavigationError(pageIndex, targetInfo);
  }

  async function scrollPresentationByEstimatedOffset(targetInfo, pageIndex, pageCount) {
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const maxTop = Math.max(0, metrics.totalHeight - metrics.visibleHeight);
    const step = estimatePresentationPageStep(targetInfo, pageCount);
    const byStep = step ? pageIndex * step : 0;
    const byRatio = pageCount > 1 ? maxTop * (pageIndex / (pageCount - 1)) : 0;
    const nextTop = clamp(Math.round(step ? byStep : byRatio), 0, maxTop);
    setScrollTopFor(targetInfo, nextTop);
    await waitForPaint();
    await waitForPresentationStable(targetInfo);
    return waitForPresentationPageReached(pageIndex, targetInfo, 9);
  }

  async function navigatePdfJsToPage(targetInfo, pageIndex) {
    if (!isPdfJsViewerContext()) {
      return false;
    }

    const app = window.PDFViewerApplication;
    const viewer = app?.pdfViewer;
    const pageNumber = Math.floor(Number(pageIndex)) + 1;
    if (!Number.isFinite(pageNumber) || pageNumber < 1) {
      return false;
    }

    try {
      if (viewer && "currentScaleValue" in viewer) {
        viewer.currentScaleValue = "page-fit";
      } else if (app && "currentScaleValue" in app) {
        app.currentScaleValue = "page-fit";
      }
    } catch (_error) {
      // Some hosted PDF.js builds expose read-only scale fields.
    }

    try {
      if (viewer?.scrollPageIntoView) {
        viewer.scrollPageIntoView({ pageNumber });
      }
      if (viewer && "currentPageNumber" in viewer) {
        viewer.currentPageNumber = pageNumber;
      } else if (app && "page" in app) {
        app.page = pageNumber;
      }
    } catch (_error) {
      // Fall through to DOM-based scrolling below.
    }

    const page = await waitForPdfJsPageElement(pageIndex, targetInfo);
    if (!page) {
      return false;
    }

    page.scrollIntoView?.({ block: "center", inline: "nearest" });
    await waitForPaint();
    await waitForPresentationStable(targetInfo);
    return waitForPresentationPageReached(pageIndex, targetInfo, 9);
  }

  async function waitForPdfJsPageElement(pageIndex, targetInfo) {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const page = findPresentationPageElement(pageIndex, targetInfo);
      if (page) {
        const rect = clipRectToViewport(page.getBoundingClientRect());
        if (rect.width > 0 && rect.height > 0) {
          return page;
        }
      }
      await sleep(120 + attempt * 35);
      await waitForPaint();
    }
    return null;
  }

  async function scrollPresentationPageIntoView(targetInfo, pageIndex) {
    const page = findPresentationPageElement(pageIndex, targetInfo);
    if (!page) {
      return false;
    }

    page.scrollIntoView?.({ block: "start", inline: "nearest" });
    await waitForPaint();
    await waitForPresentationStable(targetInfo);
    return waitForPresentationPageReached(pageIndex, targetInfo, 9);
  }

  async function clickPresentationThumbnail(pageIndex) {
    const rail = findThumbnailRail();
    if (!rail) {
      return false;
    }

    const pageNumber = pageIndex + 1;
    scrollThumbnailRailNearPage(rail, pageIndex);
    await waitForPaint();
    const target = await waitForThumbnailByNumber(rail, pageNumber, pageIndex);
    if (!target?.element) {
      return false;
    }

    target.element.scrollIntoView?.({ block: "center", inline: "nearest" });
    await waitForPaint();
    dispatchClick(target.element);
    await sleep(140);
    await waitForPaint();
    await waitForPresentationStable({ isWindow: true, element: document.scrollingElement || document.documentElement });
    return waitForPresentationPageReached(pageIndex, null, 10);
  }

  async function waitForThumbnailByNumber(rail, pageNumber, pageIndex) {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      scrollThumbnailRailNearPage(rail, pageIndex);
      await waitForPaint();
      const thumbnails = collectPresentationThumbnails(rail);
      const exact = thumbnails.find((item) => item.number === pageNumber);
      if (exact?.element) {
        return exact;
      }
      await sleep(120 + attempt * 70);
    }
    return null;
  }

  async function waitForPresentationPageReached(pageIndex, targetInfo = null, attempts = 8) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (isPresentationPageReached(pageIndex, targetInfo)) {
        return true;
      }
      await sleep(110 + attempt * 55);
      await waitForPaint();
    }
    return false;
  }

  function isPresentationPageReached(pageIndex, targetInfo = null) {
    const after = readPresentationPageInfo(targetInfo);
    if (Number.isFinite(Number(after.currentIndex)) && after.currentIndex === pageIndex) {
      return true;
    }

    const page = findPresentationPageElement(pageIndex, targetInfo);
    if (!page) {
      return false;
    }
    const rect = clipRectToViewport(page.getBoundingClientRect());
    return isPresentationPageRect(rect, { allowViewportFilling: true })
      && rectViewportCoverage(rect) > 0.06;
  }

  function createPresentationNavigationError(pageIndex, targetInfo = null) {
    const after = readPresentationPageInfo(targetInfo);
    const actual = Number.isFinite(Number(after.currentIndex)) ? `第 ${after.currentIndex + 1} 页` : "未知页";
    return new Error(`PPT 页码跳转失败：目标第 ${pageIndex + 1} 页，当前仍在${actual}。`);
  }

  function findThumbnailRail() {
    const candidates = collectScrollableCandidates()
      .filter((candidate) => candidate.rect.left < 240
        && candidate.rect.width < 280
        && candidate.rect.height > 240
        && candidate.element.scrollHeight > candidate.element.clientHeight + 80)
      .sort((a, b) => b.element.scrollHeight - a.element.scrollHeight);
    return candidates[0]?.element || null;
  }

  function scrollThumbnailRailNearPage(rail, pageIndex) {
    const info = readPresentationPageInfo();
    const pageCount = Math.max(1, Number(info.pageCount) || 1);
    if (pageCount <= 1) {
      return;
    }
    const maxTop = Math.max(0, rail.scrollHeight - rail.clientHeight);
    rail.scrollTop = clamp(Math.round(maxTop * (pageIndex / Math.max(pageCount - 1, 1))), 0, maxTop);
  }

  function collectPresentationThumbnails(root = null) {
    const scope = root || findThumbnailRail() || document.body;
    const items = [];
    const seen = new Set();
    const nodes = scope?.querySelectorAll("img, canvas, svg, [role='button'], [class*='thumb' i], [class*='thumbnail' i], [class*='slide' i]") || [];

    for (const node of nodes) {
      const item = thumbnailItemFor(node);
      if (!item || seen.has(item.element)) {
        continue;
      }
      seen.add(item.element);
      items.push(item);
    }

    return items.sort((a, b) => a.rect.top - b.rect.top);
  }

  function thumbnailItemFor(node) {
    let current = node;
    let best = null;
    for (let depth = 0; current && depth < 5; depth += 1) {
      const rect = clipRectToViewport(current.getBoundingClientRect());
      if (rect.left < 240 && rect.width >= 42 && rect.width <= 180 && rect.height >= 24 && rect.height <= 140) {
        best = current;
      }
      current = current.parentElement;
    }
    if (!best) {
      return null;
    }
    const rect = clipRectToViewport(best.getBoundingClientRect());
    if (rect.left >= 240 || rect.width < 42 || rect.height < 24) {
      return null;
    }
    const text = best.innerText || best.textContent || best.getAttribute("aria-label") || best.getAttribute("title") || "";
    const numberMatch = text.match(/(?:^|[^\d])(\d{1,4})(?=$|[^\d])/);
    const descriptor = descriptorFor(best, 1);
    return {
      element: best,
      rect,
      number: numberMatch ? Number(numberMatch[1]) : null,
      selected: /selected|active|current|checked|选中|当前/.test(descriptor)
    };
  }

  function estimatePresentationPageStep(targetInfo, pageCount) {
    const root = targetInfo?.element && !targetInfo.isWindow ? targetInfo.element : document.body;
    const rects = [];
    for (const node of root?.querySelectorAll("canvas, img, svg, [data-page-id], [data-slide-id], [class*='slide' i], [class*='page' i]") || []) {
      const rect = clipRectToViewport(node.getBoundingClientRect());
      if (isPresentationPageRect(rect)) {
        rects.push(rect);
      }
    }
    rects.sort((a, b) => a.top - b.top);
    for (let index = 1; index < rects.length; index += 1) {
      const delta = rects[index].top - rects[index - 1].top;
      if (delta > rects[index - 1].height * 0.75) {
        return Math.round(delta);
      }
    }

    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    if (pageCount > 1 && metrics.totalHeight > metrics.visibleHeight) {
      return Math.round(Math.max(1, (metrics.totalHeight - metrics.visibleHeight) / (pageCount - 1)));
    }
    const currentRect = findPresentationPageRect(targetInfo);
    return currentRect ? Math.round(currentRect.height + 18) : 0;
  }

  async function waitForPresentationStable(targetInfo) {
    let previous = presentationStableKey(targetInfo);
    let stable = 0;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      await sleep(DOCUMENT_STABILITY_SAMPLE_MS);
      await waitForPaint();
      const next = presentationStableKey(targetInfo);
      if (next === previous) {
        stable += 1;
        if (stable >= 2) {
          break;
        }
      } else {
        stable = 0;
      }
      previous = next;
    }
  }

  function presentationStableKey(targetInfo) {
    const rect = findPresentationPageRect(targetInfo);
    const info = readPresentationPageInfo(targetInfo);
    return [
      Math.round(getScrollTopFor(targetInfo)),
      Math.round(rect?.left || 0),
      Math.round(rect?.top || 0),
      Math.round(rect?.width || 0),
      Math.round(rect?.height || 0),
      info.currentIndex ?? ""
    ].join(":");
  }

  async function waitForVisibleContentReady(cropRect, timeoutMs = 1800) {
    const deadline = Date.now() + timeoutMs;
    let stable = 0;
    while (Date.now() < deadline) {
      const busySignals = getVisibleLoadingSignals(cropRect);
      if (busySignals.length === 0) {
        stable += 1;
        if (stable >= 2) {
          return true;
        }
      } else {
        stable = 0;
      }
      await sleep(160);
      await waitForPaint();
    }
    return false;
  }

  function getVisibleLoadingSignals(cropRect) {
    const signals = [];
    const selectors = [
      "img",
      "[aria-busy='true']",
      "[role='progressbar']",
      "[class*='loading' i]",
      "[class*='loader' i]",
      "[class*='spinner' i]",
      "[class*='skeleton' i]",
      "[class*='placeholder' i]",
      "[class*='lazy' i]",
      "[class*='spin' i]",
      "[data-loading]",
      "[data-state*='loading' i]"
    ].join(",");

    for (const node of document.body?.querySelectorAll(selectors) || []) {
      const rect = clipRectToViewport(node.getBoundingClientRect());
      if (!rectIntersects(rect, cropRect) || rect.width * rect.height < 16) {
        continue;
      }
      if (node.tagName === "IMG") {
        if (!node.complete || node.naturalWidth <= 0) {
          signals.push("image");
        }
        continue;
      }
      const descriptor = descriptorFor(node, 1);
      if (/loading|loader|spinner|skeleton|placeholder|lazy|spin|progress|加载|载入|读取/.test(descriptor)) {
        signals.push("loader");
      }
    }

    return signals.slice(0, 4);
  }

  function hidePresentationObstructions(cropRect) {
    const cropArea = Math.max(1, cropRect.width * cropRect.height);
    const nodes = Array.from(document.body?.querySelectorAll("*") || []);
    for (const node of nodes) {
      if (state.hiddenNodes.has(node)) {
        continue;
      }
      const rect = clipRectToViewport(node.getBoundingClientRect());
      if (!rectIntersects(rect, cropRect)) {
        continue;
      }
      const area = rect.width * rect.height;
      if (area <= 0 || area > cropArea * 0.18) {
        continue;
      }
      const descriptor = descriptorFor(node, 1);
      const isViewerControl = /toolbar|control|zoom|pager|page[-_ ]?number|player|menu|button|icon|pagination|工具栏|缩放|页码/.test(descriptor);
      const isBottomFloating = rect.top > cropRect.top + cropRect.height * 0.54
        && rect.left > cropRect.left + cropRect.width * 0.2
        && rect.right < cropRect.right - cropRect.width * 0.2;
      if (!isViewerControl && !isBottomFloating) {
        continue;
      }
      state.hiddenNodes.set(node, { visibility: node.style.visibility });
      node.style.visibility = "hidden";
    }
  }

  function dispatchClick(element) {
    const rect = element.getBoundingClientRect();
    const options = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      view: window
    };
    element.dispatchEvent(new MouseEvent("pointerdown", options));
    element.dispatchEvent(new MouseEvent("mousedown", options));
    element.dispatchEvent(new MouseEvent("mouseup", options));
    element.dispatchEvent(new MouseEvent("click", options));
  }

  function clipRectToViewport(rect) {
    const left = clamp(rect.left, 0, window.innerWidth);
    const top = clamp(rect.top, 0, window.innerHeight);
    const right = clamp(rect.right, 0, window.innerWidth);
    const bottom = clamp(rect.bottom, 0, window.innerHeight);
    return {
      left,
      top,
      right,
      bottom,
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  }

  function rectIntersects(a, b) {
    return a.right > b.x
      && a.left < b.x + b.width
      && a.bottom > b.y
      && a.top < b.y + b.height;
  }

  function chooseDocumentCaptureTarget(scrollingElement, windowScore, candidates) {
    const pageSignal = getDocumentPageSignal();
    const viewportArea = Math.max(window.innerWidth * window.innerHeight, 1);
    const scored = candidates
      .map((candidate) => {
        const signal = scoreDocumentCandidate(candidate);
        const visibleArea = candidate.visibleHeight * candidate.visibleWidth;
        const areaCoverage = visibleArea / viewportArea;
        let score = candidate.score;

        score *= 1 + Math.min(signal.positive, 8) * 0.42;
        score *= 1 + Math.min(areaCoverage, 0.95);

        if (candidate.rect.width >= window.innerWidth * 0.48 && candidate.rect.height >= window.innerHeight * 0.46) {
          score *= 1.35;
        }
        if (signal.negative) {
          score *= Math.max(0.18, 1 - signal.negative * 0.2);
        }
        if (candidate.rect.width < Math.min(520, window.innerWidth * 0.42)) {
          score *= 0.35;
        }
        if (candidate.rect.left < 260 && candidate.rect.width < window.innerWidth * 0.42) {
          score *= 0.2;
        }

        return {
          ...candidate,
          documentSignal: signal.positive,
          documentScore: score,
          label: signal.label || candidate.label
        };
      })
      .filter((candidate) => candidate.documentSignal > 0 || pageSignal > 0);

    scored.sort((a, b) => b.documentScore - a.documentScore);
    const best = scored[0];

    if (
      best
      && best.documentScore > windowScore * 0.82
      && best.rect.width >= Math.min(520, window.innerWidth * 0.42)
    ) {
      return {
        ...best,
        score: best.documentScore,
        label: `Document/PPT viewer: ${best.label}`,
        captureProfile: "document"
      };
    }

    if (pageSignal > 0) {
      return {
        isWindow: true,
        element: scrollingElement,
        label: "Document/PPT page window",
        score: windowScore * (1 + Math.min(pageSignal, 6) * 0.22),
        captureProfile: "document"
      };
    }

    return null;
  }

  function getDocumentPageSignal() {
    const hostSignal = /(^|\.)((feishu|larksuite)\.cn|larksuite\.com)$/i.test(location.hostname) ? 3 : 0;
    const pathSignal = /docs|docx|slides?|presentation|ppt|file|drive|space/i.test(location.href) ? 2 : 0;
    const bodySignal = scoreTextForDocumentKeywords(document.body ? descriptorFor(document.body, 1) : "");
    return hostSignal + pathSignal + Math.min(bodySignal, 3);
  }

  function scoreDocumentCandidate(candidate) {
    const descriptor = descriptorFor(candidate.element, 4);
    let positive = scoreTextForDocumentKeywords(descriptor);
    let negative = scoreTextForNavigationKeywords(descriptor);
    const slideNodes = countDescendants(candidate.element, [
      "canvas",
      "svg",
      "img",
      "video",
      "[data-page-id]",
      "[data-slide-id]",
      "[data-testid*='slide' i]",
      "[data-testid*='presentation' i]",
      "[class*='slide' i]",
      "[class*='ppt' i]",
      "[class*='presentation' i]",
      "[aria-label*='幻灯片']",
      "[aria-label*='PPT']"
    ].join(","), 32);

    if (slideNodes >= 3) {
      positive += 3;
    } else if (slideNodes > 0) {
      positive += 1;
    }
    if (candidate.scrollableRatio > 1.8 && candidate.viewportCoverage > 0.24) {
      positive += 1;
    }

    return {
      positive,
      negative,
      label: positive > 0 ? labelFor(candidate.element) : ""
    };
  }

  function descriptorFor(element, ancestorDepth) {
    const chunks = [];
    let current = element;
    for (let depth = 0; current && depth <= ancestorDepth; depth += 1) {
      chunks.push(current.tagName || "");
      chunks.push(current.id || "");
      chunks.push(typeof current.className === "string" ? current.className : "");
      chunks.push(current.getAttribute?.("role") || "");
      chunks.push(current.getAttribute?.("aria-label") || "");
      chunks.push(current.getAttribute?.("title") || "");
      chunks.push(current.getAttribute?.("data-testid") || "");
      chunks.push(current.getAttribute?.("data-qa") || "");
      current = current.parentElement;
    }
    return chunks.join(" ").toLowerCase();
  }

  function scoreTextForDocumentKeywords(text) {
    let score = 0;
    const patterns = [
      /ppt/,
      /presentation/,
      /slides?/,
      /deck/,
      /viewer/,
      /preview/,
      /reader/,
      /render/,
      /canvas/,
      /document/,
      /docx?/,
      /file/,
      /drive/,
      /page/,
      /正文/,
      /文档/,
      /幻灯片/,
      /演示/,
      /预览/
    ];
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score += 1;
      }
    }
    return score;
  }

  function scoreTextForNavigationKeywords(text) {
    let score = 0;
    const patterns = [
      /sidebar/,
      /sider/,
      /thumbnail/,
      /thumb/,
      /outline/,
      /catalog/,
      /toc/,
      /comment/,
      /toolbar/,
      /header/,
      /breadcrumb/,
      /menu/,
      /目录/,
      /缩略图/,
      /评论/,
      /工具栏/
    ];
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score += 1;
      }
    }
    return score;
  }

  function countDescendants(element, selector, limit) {
    try {
      return Math.min(element.querySelectorAll(selector).length, limit);
    } catch (_error) {
      return 0;
    }
  }

  function scoreWindow(scrollingElement) {
    const scrollableHeight = Math.max(scrollingElement.scrollHeight - window.innerHeight, 0);
    const scrollableRatio = scrollingElement.scrollHeight / Math.max(window.innerHeight, 1);
    return Math.max(scrollingElement.scrollHeight * window.innerWidth * Math.min(scrollableRatio, 10), scrollableHeight * 1000);
  }

  function buildTargetPayload(targetInfo, metrics, captureProfile = "default") {
    const pageInfo = targetInfo.captureStrategy === "pages" ? readPresentationPageInfo(targetInfo) : null;
    const pageRect = targetInfo.captureStrategy === "pages" ? findPresentationPageRect(targetInfo) : null;
    const pageCount = Number.isFinite(Number(targetInfo.pageCount))
      ? Number(targetInfo.pageCount)
      : Number(pageInfo?.pageCount) || null;
    const logicalPageHeight = pageRect ? Math.max(1, Math.round(pageRect.height)) : metrics.visibleHeight;
    return {
      mode: targetInfo.isWindow ? "window" : "inner-scroll",
      label: targetInfo.label,
      score: targetInfo.score,
      captureProfile,
      captureStrategy: targetInfo.captureStrategy || "scroll",
      pageCount,
      currentPageIndex: Number.isFinite(Number(pageInfo?.currentIndex)) ? pageInfo.currentIndex : targetInfo.currentPageIndex ?? null,
      totalHeight: targetInfo.captureStrategy === "pages" && pageCount ? pageCount * logicalPageHeight : metrics.totalHeight,
      totalWidth: targetInfo.captureStrategy === "pages" && pageRect ? pageRect.width : metrics.totalWidth,
      visibleHeight: targetInfo.captureStrategy === "pages" && pageRect ? pageRect.height : metrics.visibleHeight,
      visibleWidth: targetInfo.captureStrategy === "pages" && pageRect ? pageRect.width : metrics.visibleWidth,
      frameUrl: location.href,
      isTopFrame: window.top === window
    };
  }

  function labelFor(element) {
    const parts = [];
    if (element.id) {
      parts.push(`#${element.id}`);
    }
    if (element.className && typeof element.className === "string") {
      parts.push(`.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`);
    }
    return parts.join("") || element.tagName.toLowerCase();
  }

  function getMetrics() {
    return getMetricsFor(state.target || document.scrollingElement || document.documentElement, state.isWindow);
  }

  function getMetricsFor(target, isWindow) {
    if (isWindow) {
      const scrollingElement = target || document.scrollingElement || document.documentElement;
      return {
        totalHeight: scrollingElement.scrollHeight,
        totalWidth: Math.min(scrollingElement.scrollWidth, window.innerWidth),
        visibleHeight: window.innerHeight,
        visibleWidth: window.innerWidth,
        cropRect: {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
    }

    const rect = target.getBoundingClientRect();
    const left = clamp(rect.left, 0, window.innerWidth);
    const top = clamp(rect.top, 0, window.innerHeight);
    const right = clamp(rect.right, 0, window.innerWidth);
    const bottom = clamp(rect.bottom, 0, window.innerHeight);

    return {
      totalHeight: target.scrollHeight,
      totalWidth: Math.min(target.scrollWidth, right - left),
      visibleHeight: Math.max(0, bottom - top),
      visibleWidth: Math.max(0, right - left),
      cropRect: {
        x: left,
        y: top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
      }
    };
  }

  function getScrollTop() {
    if (state.isWindow) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }
    return state.target.scrollTop;
  }

  function setScrollTop(value) {
    if (state.isWindow) {
      window.scrollTo(0, value);
      return;
    }
    state.target.scrollTop = value;
  }

  function getScrollTopFor(targetInfo) {
    if (targetInfo.isWindow) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }
    return targetInfo.element.scrollTop;
  }

  function setScrollTopFor(targetInfo, value) {
    if (targetInfo.isWindow) {
      window.scrollTo(0, value);
      return;
    }
    targetInfo.element.scrollTop = value;
  }

  async function waitForStableMetrics() {
    await waitForPaint();
    let previous = metricsKey(getMetrics());
    let stableCount = 0;
    const sampleMs = state.captureProfile === "document" ? DOCUMENT_STABILITY_SAMPLE_MS : STABILITY_SAMPLE_MS;
    const maxAttempts = state.captureProfile === "document" ? 14 : 10;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await sleep(sampleMs);
      await waitForPaint();
      const next = metricsKey(getMetrics());
      if (next === previous) {
        stableCount += 1;
        if (stableCount >= 2) {
          break;
        }
      } else {
        stableCount = 0;
      }
      previous = next;
    }

    return getMetrics();
  }

  function metricsKey(metrics) {
    return [
      Math.round(getScrollTop()),
      Math.round(metrics.totalHeight),
      Math.round(metrics.visibleHeight),
      Math.round(metrics.cropRect.y),
      Math.round(metrics.cropRect.height)
    ].join(":");
  }

  function updateRepeatedFixedVisibility(index) {
    const fixedNodes = Array.from(document.body?.querySelectorAll("*") || []).filter((node) => {
      if (!state.isWindow && !state.target.contains(node)) {
        return false;
      }
      const position = window.getComputedStyle(node).position;
      if (position !== "fixed" && position !== "sticky") {
        return false;
      }
      const rect = node.getBoundingClientRect();
      const cropRect = getMetrics().cropRect;
      const intersectsCrop = rect.right > cropRect.x
        && rect.left < cropRect.x + cropRect.width
        && rect.bottom > cropRect.y
        && rect.top < cropRect.y + cropRect.height;
      return intersectsCrop && rect.width > 80 && rect.height > 24;
    });

    for (const node of fixedNodes) {
      if (!state.hiddenNodes.has(node)) {
        state.hiddenNodes.set(node, { visibility: node.style.visibility });
      }
      node.style.visibility = index === 0 ? state.hiddenNodes.get(node).visibility : "hidden";
    }
  }

  function listIframes() {
    return Array.from(document.querySelectorAll("iframe, frame")).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        src: element.src || element.getAttribute("src") || "",
        id: element.id || "",
        name: element.name || "",
        title: element.title || "",
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }
      };
    });
  }

  function getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
