const elements = {
  captureNow: document.querySelector("#captureNow"),
  captureCurrent: document.querySelector("#captureCurrent"),
  captureRange: document.querySelector("#captureRange"),
  stopCapture: document.querySelector("#stopCapture"),
  status: document.querySelector("#status")
};

let activeTab = null;
let runningTabId = null;

init().catch((error) => {
  setStatus(error.message || String(error), true);
});

elements.captureNow.addEventListener("click", () => {
  startCapture("immediate");
});

elements.captureCurrent.addEventListener("click", () => {
  startCapture("current");
});

elements.captureRange.addEventListener("click", () => {
  startCapture("range");
});

elements.stopCapture.addEventListener("click", async () => {
  if (!activeTab?.id) {
    return;
  }
  try {
    setButtonsDisabled(true);
    const response = await chrome.runtime.sendMessage({
      type: "STOP_CAPTURE",
      tabId: runningTabId || activeTab.id
    });
    if (!response?.ok) {
      throw new Error(response?.error || "停止失败。");
    }
    setStatus(response.stopped ? "已请求停止，正在导出已截部分。" : "当前标签没有正在进行的截图。");
    setTimeout(() => window.close(), 500);
  } catch (error) {
    setButtonsDisabled(false);
    setStatus(error.message || String(error), true);
  }
});

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;
  if (!activeTab?.id) {
    setButtonsDisabled(true);
    setStatus("没有可截图的当前标签。", true);
    return;
  }

  const state = await chrome.runtime.sendMessage({
    type: "GET_RUNNING_STATE",
    tabId: activeTab.id
  });
  const running = Boolean(state?.ok && state.running);
  runningTabId = running ? state.tabId : null;
  elements.stopCapture.disabled = !running;
  elements.captureNow.disabled = running;
  elements.captureCurrent.disabled = running;
  elements.captureRange.disabled = running;
  setStatus(running ? "正在截图。按 Esc 或点击停止，导出已截部分。" : "选择截图方式。");
}

async function startCapture(mode) {
  if (!activeTab?.id) {
    return;
  }

  try {
    setButtonsDisabled(true);
    const response = await chrome.runtime.sendMessage({
      type: "START_CAPTURE",
      tabId: activeTab.id,
      mode
    });
    if (!response?.ok) {
      throw new Error(response?.error || "启动截图失败。");
    }
    const message = mode === "range"
      ? "移动鼠标定位，点击页面正文或左下角按钮标记起点和终点。"
      : mode === "current"
        ? "已从当前滚动位置开始截图。"
        : "已开始截图。";
    setStatus(message);
    setTimeout(() => window.close(), 500);
  } catch (error) {
    setButtonsDisabled(false);
    setStatus(error.message || String(error), true);
  }
}

function setButtonsDisabled(disabled) {
  elements.captureNow.disabled = disabled;
  elements.captureCurrent.disabled = disabled;
  elements.captureRange.disabled = disabled;
  elements.stopCapture.disabled = disabled;
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
}
