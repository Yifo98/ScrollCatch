中文说明：

ScrollCatch — Full Page Capture 是一个本地优先的网页长截图、裁切、分页和分节合并导出工具。它可以捕获完整网页、在线文档、长文章、订单记录、网页报告，以及飞书 / Lark 等在线文档中打开后的 PPT / 演示文稿预览页。

本次 1.0.2 更新重点：

- 新增飞书 / Lark PPT 预览页按页捕获。打开 PPT 预览后，扩展会尽量按左侧页码逐页截图，而不是像普通网页一样按滚动距离切片。
- 捕获完整页面入口会自动判断当前页面类型：PPT 预览页按页捕获，普通网页继续滚动拼接。
- PPT 结果页会按截图页边界分页，不再显示普通网页的 PDF 参考区，导出分页 PNG、分页 JPEG 或 PDF 更直观。
- 优化长网页截图速度和加载等待。图片很多的网页可先手动滚到底部预加载，再回到起点截图。
- 修复“回到结束位置”和“从结束位置继续获取”可能跳回页面开头的问题。
- Windows 端 PPT 页码跳转失败时会重试并显示更清楚的中文提示。

主要功能：

- 捕获完整网页、从当前位置捕获、框选捕获范围。
- 支持裁切、导出 PNG / JPEG / PDF。
- 支持分页 PNG ZIP、分页 JPEG ZIP 和分页 PDF。
- 支持自定义分页线、键盘快捷键和 PDF 分页风险提示。
- 支持超长页面分段截图，并从结束位置继续获取。
- 支持分节管理、分节排序和合并编辑。
- 支持本地截图缓存查看与删除。

隐私说明：

ScrollCatch — Full Page Capture 采用本地优先设计。截图数据、编辑草稿和本地缓存保存在浏览器扩展的本地存储中，不会上传到任何外部服务器。

项目主页：
https://github.com/Yifo98/ScrollCatch

-------------------------------------------------------------------------

English Description:

ScrollCatch — Full Page Capture is a local-first full-page screenshot, cropping, pagination, and section merge export tool. It helps capture long web pages, online documents, articles, receipts, reports, and opened PPT / presentation preview pages in Feishu, Lark, and similar document viewers.

What is new in 1.0.2:

- Added page-by-page capture for Feishu / Lark PPT preview pages. After opening a PPT preview, the extension tries to capture each slide page by page instead of slicing by normal scroll distance.
- The main capture entry now detects the page type automatically: PPT previews use page capture, while regular web pages use scrolling capture.
- PPT result pages use captured slide boundaries for pagination and no longer show the normal web-page PDF reference zones.
- Improved long-page capture speed and loading waits. For image-heavy pages, users can scroll to the bottom first to preload lazy-loaded content, then return to the start and capture.
- Fixed cases where “return to end position” and “continue from end position” could jump back to the top of the page.
- Improved PPT page navigation retries and clearer error messages on Windows.

Main features:

- Capture a full page, capture from the current position, or select a custom range.
- Crop and export PNG, JPEG, or PDF.
- Export paginated PNG ZIP, paginated JPEG ZIP, and paginated PDF.
- Customize page-break lines with keyboard shortcuts and PDF pagination warnings.
- Capture very long pages in sections and continue from the end position.
- Manage, reorder, and merge captured sections.
- View and delete local screenshot caches.

Privacy:

ScrollCatch — Full Page Capture is local-first. Screenshot data, editing drafts, and local caches are stored in the browser extension's local storage and are not uploaded to any external server.

Project homepage:
https://github.com/Yifo98/ScrollCatch
