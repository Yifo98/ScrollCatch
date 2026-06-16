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
  setStatus(running ? "正在截图。按 Esc 或点击停止，导出已截部分。" : getIdleStatus(activeTab));
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
    setStatus(getStartStatus(mode));
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

function getIdleStatus(tab) {
  if (/(\.|\/\/)(feishu|larksuite)\./i.test(tab?.url || "")) {
    return "检测到飞书页面。打开 PPT 预览后按页捕获，普通文档按页面滚动捕获。";
  }
  return "选择捕获方式。网页按滚动捕获，PPT 预览按页捕获。";
}

function getStartStatus(mode) {
  if (mode === "range") {
    return "在页面上标记起点和终点，也可以按 Enter 直接截到页面结尾。";
  }
  if (mode === "current") {
    return "已从当前可见位置开始捕获。";
  }
  return "已开始捕获完整页面。PPT 按页捕获，网页滚动拼接。";
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
}
