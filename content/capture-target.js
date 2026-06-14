(() => {
  const VERSION = "0.3.2";
  const SCROLL_STRIDE_RATIO = 0.96;
  const STABILITY_SAMPLE_MS = 95;

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
    stopKeyHandler: null,
    startPickerCleanup: null
  };

  function handleMessage(message, _sender, sendResponse) {
    if (message?.type === "XF_MEASURE_CAPTURE") {
      Promise.resolve().then(measureCapture).then(sendResponse).catch((error) => {
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
      Promise.resolve().then(pickCaptureRange).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_GET_CURRENT_SCROLL_POSITION") {
      Promise.resolve().then(getCurrentScrollPosition).then(sendResponse).catch((error) => {
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
      Promise.resolve().then(() => scrollToPosition(message.scrollTop)).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error.message || String(error) });
      });
      return true;
    }

    if (message?.type === "XF_RESTORE_CAPTURE") {
      restoreCapture();
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

  async function measureCapture() {
    const targetInfo = findBestScrollTarget();
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    return {
      ok: true,
      target: buildTargetPayload(targetInfo, metrics)
    };
  }

  async function prepareCapture(options = {}) {
    restoreCapture();

    const targetInfo = findBestScrollTarget();
    state.target = targetInfo.element;
    state.isWindow = targetInfo.isWindow;
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
    if (options.enableKeyStop || options.enableClickStop) {
      installStopKeyListener();
    }

    const metrics = await waitForStableMetrics();
    return {
      ok: true,
      target: buildTargetPayload(targetInfo, metrics)
    };
  }

  async function scrollToStep(step, index) {
    setScrollTop(step.scrollTop);
    updateRepeatedFixedVisibility(index);
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

  async function scrollToPosition(scrollTop) {
    const targetInfo = findBestScrollTarget();
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const maxTop = Math.max(0, metrics.totalHeight - metrics.visibleHeight);
    const nextTop = clamp(Math.round(Number(scrollTop) || 0), 0, maxTop);
    setScrollTopFor(targetInfo, nextTop);
    await waitForPaint();
    await waitForPaint();
    return {
      ok: true,
      scrollTop: getScrollTopFor(targetInfo),
      totalHeight: metrics.totalHeight
    };
  }

  async function getCurrentScrollPosition() {
    const targetInfo = findBestScrollTarget();
    const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
    const scrollTop = getScrollTopFor(targetInfo);
    return {
      ok: true,
      scrollTop,
      maxScrollTop: Math.max(0, metrics.totalHeight - metrics.visibleHeight),
      target: buildTargetPayload(targetInfo, metrics)
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
  }

  function pickCaptureRange() {
    cancelStartPicker();

    const targetInfo = findBestScrollTarget();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      const controlsLayer = document.createElement("div");
      const line = document.createElement("div");
      const startLine = document.createElement("div");
      const label = document.createElement("div");
      const controls = document.createElement("div");
      const startButton = document.createElement("button");
      const endButton = document.createElement("button");
      const toEndButton = document.createElement("button");
      const cancelButton = document.createElement("button");
      let startScrollTop = null;
      let currentClientY = Math.round(window.innerHeight / 2);

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
        "border-top: 2px solid #0f766e",
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
      label.textContent = "移动鼠标定位，点击页面正文或“标记起点”；Esc 取消";
      label.style.cssText = [
        "position: fixed",
        "right: 16px",
        "top: calc(50% + 10px)",
        "padding: 7px 10px",
        "border-radius: 7px",
        "background: rgba(15, 118, 110, 0.94)",
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
        "border: 1px solid rgba(15, 118, 110, 0.28)",
        "border-radius: 8px",
        "background: rgba(255, 255, 255, 0.96)",
        "box-shadow: 0 12px 34px rgba(15, 23, 42, 0.22)",
        "pointer-events: auto"
      ].join(";");
      for (const button of [startButton, endButton, toEndButton, cancelButton]) {
        button.type = "button";
        button.style.cssText = [
          "min-height: 32px",
          "border: 1px solid #0f766e",
          "border-radius: 7px",
          "padding: 0 10px",
          "background: #0f766e",
          "color: #fff",
          "font: 12px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          "font-weight: 700",
          "cursor: pointer"
        ].join(";");
        button.style.setProperty("pointer-events", "auto", "important");
      }
      startButton.textContent = "标记起点";
      endButton.textContent = "标记终点";
      toEndButton.textContent = "截到页面结束";
      cancelButton.textContent = "取消";
      endButton.disabled = true;
      toEndButton.disabled = true;
      cancelButton.style.background = "#fff";
      cancelButton.style.color = "#0f766e";
      controls.append(startButton, endButton, toEndButton, cancelButton);
      controlsLayer.appendChild(controls);
      overlay.append(startLine, line, label);
      document.documentElement.appendChild(overlay);
      document.documentElement.appendChild(controlsLayer);

      const stopControlEvent = (event) => {
        event.stopPropagation();
      };

      const cleanup = () => {
        document.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("pointerdown", onPagePointerDown, true);
        document.removeEventListener("keydown", onKeydown, true);
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
      };

      const finish = (payload) => {
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
        label.textContent = "已标记起点。可以滚动页面，再点击页面正文或“标记终点”；按 Enter 截到页面结束，Esc 取消";
      };

      const markEnd = (event) => {
        stopPickerEvent(event);

        const pickedScrollTop = getPickedScrollTop(targetInfo, currentClientY);
        if (startScrollTop === null) {
          label.textContent = "请先标记起点。";
          return;
        }

        if (pickedScrollTop <= startScrollTop + 8) {
          label.textContent = "终点要在起点下方。可以继续滚动页面，再点击页面正文或“标记终点”；或按 Enter 截到页面结束";
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
          label.textContent = "请先标记起点。";
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
      };

      function updateStartLinePosition() {
        if (startScrollTop === null) {
          startLine.style.display = "none";
          return;
        }
        const metrics = getMetricsFor(targetInfo.element, targetInfo.isWindow);
        const currentScrollTop = getScrollTopFor(targetInfo);
        const y = metrics.cropRect.y + startScrollTop - currentScrollTop;
        if (y < metrics.cropRect.y || y > metrics.cropRect.y + metrics.visibleHeight) {
          startLine.style.display = "none";
          return;
        }
        startLine.style.top = `${y}px`;
        startLine.style.display = "block";
      }

      state.startPickerCleanup = cleanup;
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
      document.addEventListener("keydown", onKeydown, true);
      document.addEventListener("scroll", updateStartLinePosition, true);
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
    const maxTop = Math.max(0, metrics.totalHeight - metrics.visibleHeight);
    return Math.round(clamp(currentScrollTop + viewportOffset, 0, maxTop));
  }

  function cancelStartPicker() {
    if (typeof state.startPickerCleanup === "function") {
      const cleanup = state.startPickerCleanup;
      state.startPickerCleanup = null;
      cleanup();
    }
  }

  function installStopKeyListener() {
    removeStopKeyListener();
    state.stopKeyHandler = (event) => {
      if (!state.captureSessionId || event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        chrome.runtime.sendMessage({
          type: "XF_USER_STOP_CAPTURE",
          sessionId: state.captureSessionId
        });
      } catch (error) {
        console.warn("Could not request capture stop.", error);
      }
    };
    document.addEventListener("keydown", state.stopKeyHandler, true);
  }

  function removeStopKeyListener() {
    if (!state.stopKeyHandler) {
      return;
    }
    document.removeEventListener("keydown", state.stopKeyHandler, true);
    state.stopKeyHandler = null;
  }

  function findBestScrollTarget() {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const windowScore = scoreWindow(scrollingElement);
    const candidates = [];

    for (const element of document.body?.querySelectorAll("*") || []) {
      const style = window.getComputedStyle(element);
      const overflowY = style.overflowY;
      if (!/(auto|scroll|overlay)/.test(overflowY)) {
        continue;
      }
      if (element.scrollHeight - element.clientHeight < 220) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 320 || rect.height < 260) {
        continue;
      }
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        continue;
      }
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      if (visibleHeight <= 0 || visibleWidth <= 0) {
        continue;
      }
      const scrollableRatio = element.scrollHeight / Math.max(element.clientHeight, 1);
      const viewportCoverage = (visibleHeight * visibleWidth) / Math.max(window.innerWidth * window.innerHeight, 1);
      const score = element.scrollHeight * visibleWidth * Math.min(scrollableRatio, 10) * Math.min(Math.max(viewportCoverage, 0.15), 1);
      candidates.push({ element, rect, score, label: labelFor(element), isWindow: false });
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

  function scoreWindow(scrollingElement) {
    const scrollableHeight = Math.max(scrollingElement.scrollHeight - window.innerHeight, 0);
    const scrollableRatio = scrollingElement.scrollHeight / Math.max(window.innerHeight, 1);
    return Math.max(scrollingElement.scrollHeight * window.innerWidth * Math.min(scrollableRatio, 10), scrollableHeight * 1000);
  }

  function buildTargetPayload(targetInfo, metrics) {
    return {
      mode: targetInfo.isWindow ? "window" : "inner-scroll",
      label: targetInfo.label,
      score: targetInfo.score,
      totalHeight: metrics.totalHeight,
      totalWidth: metrics.totalWidth,
      visibleHeight: metrics.visibleHeight,
      visibleWidth: metrics.visibleWidth,
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

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await sleep(STABILITY_SAMPLE_MS);
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
