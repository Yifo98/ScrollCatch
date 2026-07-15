import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function createI18n(storedLocale = null) {
  const writes = [];
  const listeners = [];
  const storage = storedLocale ? { "xfFullPageCapture:locale": storedLocale } : {};
  const context = vm.createContext({
    chrome: {
      storage: {
        local: {
          async get() {
            return { ...storage };
          },
          async set(value) {
            writes.push(value);
            Object.assign(storage, value);
          }
        },
        onChanged: {
          addListener(listener) {
            listeners.push(listener);
          }
        }
      }
    },
    console,
    globalThis: null
  });
  context.globalThis = context;
  const source = await fs.readFile(new URL("../shared/i18n.js", import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: "shared/i18n.js" });
  await context.XFI18n.ready();
  return { i18n: context.XFI18n, listeners, storage, writes };
}

test("interface locale defaults to English and restores a saved Chinese choice", async () => {
  const english = await createI18n();
  assert.equal(english.i18n.getLocale(), "en");
  assert.equal(english.i18n.translateText("保存 PNG"), "Save PNG");
  assert.equal(english.i18n.localeForIntl(), "en-US");

  const chinese = await createI18n("zh-CN");
  assert.equal(chinese.i18n.getLocale(), "zh-CN");
  assert.equal(chinese.i18n.translateText("保存 PNG"), "保存 PNG");
});

test("choosing Chinese persists and is restored on the next open", async () => {
  const firstOpen = await createI18n();
  await firstOpen.i18n.setLocale("zh-CN");
  assert.equal(firstOpen.storage["xfFullPageCapture:locale"], "zh-CN");

  const nextOpen = await createI18n(firstOpen.storage["xfFullPageCapture:locale"]);
  assert.equal(nextOpen.i18n.getLocale(), "zh-CN");
  assert.equal(nextOpen.i18n.translateText("保存 PNG"), "保存 PNG");
});

test("switching language persists the choice and translates dynamic workbench copy", async () => {
  const { i18n, storage, writes } = await createI18n();
  await i18n.setLocale("en");

  assert.equal(storage["xfFullPageCapture:locale"], "en");
  assert.equal(writes.at(-1)["xfFullPageCapture:locale"], "en");
  assert.equal(
    i18n.translateText("已加载 3 段。当前只保留正在编辑分段的高清预览。"),
    "3 sections loaded. Only the active section keeps a high-resolution preview."
  );
  assert.equal(
    i18n.translateText("已加载 1 段。当前只保留正在编辑分段的高清预览。"),
    "1 section loaded. Only the active section keeps a high-resolution preview."
  );
  assert.equal(
    i18n.translateText("第 2 页超过 PDF 参考区，直接导出 PDF 可能被纵向压缩变形。"),
    "Page 2 exceeds the PDF reference area and may be compressed vertically."
  );
  assert.equal(i18n.translateText("自定义分页线"), "Custom page breaks");
  assert.equal(i18n.translateText("裁切到当前可见区域"), "Crop to visible area");
  assert.equal(i18n.translateText("当前裁切：全图"), "Current crop: Full image");
  assert.equal(
    i18n.translateText("当前裁切：X 708 · Y 1 · 1056 × 9475"),
    "Current crop: X 708 · Y 1 · 1056 × 9475"
  );
  assert.equal(i18n.translateText("更多导出与缓存"), "More export and cache options");
  assert.equal(i18n.translateText("分页快捷键"), "Pagination shortcuts");
  assert.equal(i18n.translateText("自定义 P2 · 偏短"), "Custom P2 · Short");
  assert.equal(
    i18n.translateText("2 条：34% / 67%。已选中第 1 条"),
    "2 breaks: 34% / 67%. Break 1 selected"
  );
  assert.equal(
    i18n.translateText("按截图页边界：3 页。已选中第 2 条"),
    "Slide boundaries: 3 pages. Break 2 selected"
  );
  assert.equal(
    i18n.translateText("已自动整理 1 段连续截图，可统一调整、分页和导出。"),
    "1 continuous section organized and ready to adjust, paginate, and export."
  );
  assert.equal(
    i18n.translateText("导出后自动删除本次截图缓存"),
    "Delete these capture caches after export"
  );
  assert.equal(i18n.translateText("3 张切片"), "3 slices");
  assert.equal(i18n.translateText("合并导出 PDF"), "Combine and export PDF");
  assert.equal(i18n.translateText("合并 PDF 已保存"), "Combined PDF saved");
  assert.equal(i18n.translateText("管理与排序"), "Manage and reorder");
  assert.equal(i18n.translateText("导出后清理本次组合缓存"), "Clear this capture set after export");
});

test("extension pages and package include the bilingual runtime", async () => {
  const [manifestSource, popup, result, merge, packageScript, captureTarget] = await Promise.all([
    fs.readFile(new URL("../manifest.json", import.meta.url), "utf8"),
    fs.readFile(new URL("../popup/popup.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../result/result.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../result/merge.html", import.meta.url), "utf8"),
    fs.readFile(new URL("../scripts/package-release.sh", import.meta.url), "utf8"),
    fs.readFile(new URL("../content/capture-target.js", import.meta.url), "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);

  assert.equal(manifest.default_locale, "en");
  for (const page of [popup, result, merge]) {
    assert.match(page, /data-locale-select/);
    assert.match(page, /class="locale-label">界面语言<\/span>/);
    assert.match(page, /shared\/i18n\.js/);
  }
  assert.match(packageScript, /_locales/);
  assert.match(packageScript, /shared/);
  assert.match(captureTarget, /function normalizeInterfaceLocale\(value\)/);
  assert.match(captureTarget, /normalizeInterfaceLocale\(changes\[LOCALE_STORAGE_KEY\]\.newValue\)/);
});
