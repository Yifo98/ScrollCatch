中文说明：

本次更新：

XF FullPage Capture 1.0.1 是一次体验优化版本，重点改进截图结果页和分节合并编辑器里的自定义分页线、快捷键提示和加载反馈。

新版优化了自定义分页线的可操作性。普通结果页和分节合并编辑器中的分页线都更细、更不遮挡正文内容，同时保留足够的拖拽热区，方便用户在裁切框内部直接拖动分页线。选中分页线后，界面会高亮当前线，并支持 Delete 或 Backspace 删除。

新版优化了 PDF 参考区显示。参考区边框和背景更轻，不会大面积压住正文内容。用户仍然可以通过参考区判断分页是否偏长、偏短或接近纸张范围，但阅读原文时不会被过重的提示层干扰。

新版补充了更明确的自定义分页操作指引。建议用户先框选要保留的正文范围，去掉边栏和空白区域，再开启自定义分页线。开启后，界面会提示当前可用的分页线快捷键：A、+ 或 = 用来新增分页线，Delete 或 Backspace 用来删除选中的分页线。

新版统一了普通结果页、分节合并编辑器和扩展弹窗中的快捷键提示样式。截图弹窗现在会用更清楚的键盘提示展示 Enter、Esc 和 Alt+Shift+S 的用途；结果页和合并编辑器也会在自定义分页区域内显示更醒目的分页线快捷键说明。

新版优化了加载反馈。截图结果页和分节合并编辑器在读取、拼接或处理多张长图切片时，会显示从左到右循环移动的加载动画，减少用户误以为程序无响应的情况。

新版继续保留 1.0.0 的核心能力，包括分节截图管理、分节合并编辑器、分页 PNG ZIP、分页 JPEG ZIP、合并 PDF、裁切导出、自定义分页线、PDF 参考区、PDF 变形风险提示、超长页面分段截取、从上次结束位置继续截取、截图时切换标签页暂停等待、Esc 或 Alt + Shift + S 停止截图、历史截图缓存查看与删除等。

使用建议：
如果页面一次性截完，用户通常可以直接在结果页进行裁切、分页和导出，不需要进入合并编辑器。合并编辑器主要用于第一次没有截完整篇文章，或需要把多段截图统一分页、合并并导出的情况。

完整介绍：

XF FullPage Capture 是一个本地优先的网页长截图、裁切、分页和分节合并导出工具，帮助用户在浏览器中捕获完整网页，并将结果导出为 PNG、JPEG、分页图片或 PDF。

它适合用于保存长网页、在线文档、知识库页面、教程资料、研究材料、订单记录、网页报告、微信公众号文章，以及普通截图无法一次完整保存的页面。

使用时，用户只需要打开目标网页并点击扩展图标。插件会根据用户选择捕获完整页面、从当前滚动位置继续截图，或按用户自定义的起点和终点截取页面范围。截图完成后，插件会在本地结果页中生成预览。用户可以裁切需要保留的区域，调整导出缩放，设置分页线，然后导出为完整长图、分页图片文件或 PDF。

如果页面过长无法一次截完，用户可以从上次结束位置继续截取下一节。截完多节后，可以进入分节合并编辑器，在同一页面查看和调整多个分节，再导出为分页 PNG ZIP、分页 JPEG ZIP 或一份合并 PDF。

主要功能：

捕获完整网页和在线文档页面
尽量识别和处理页面中的内部滚动区域
支持微信公众号文章页面导出
支持立即截图、从当前位置开始截图、自定义起点/终点截图
支持截图后本地预览
支持拖拽裁切导出范围，去除无关侧边栏或空白区域
支持自定义分页线，让分页图片和 PDF 更整洁
支持新增、移动、选中和删除分页线
支持键盘快捷键新增和删除分页线
支持 PDF 分页参考区和变形风险提示
支持导出 PNG、JPEG、分页 PNG、分页 JPEG 和分页 PDF
支持超长页面分段截取，并可从上次结束位置继续
支持分节管理、分节排序和分节合并编辑
支持在合并编辑器中分别调整每一节的裁切、缩放和分页线
支持跨分节导出分页 PNG ZIP、分页 JPEG ZIP 和合并 PDF
支持截图过程中暂停等待源标签页，避免误截其他页面
支持查看和删除本地截图缓存

关于分节合并：
分节合并主要用于超长页面无法一次完整截取的情况。用户可以先截取上半部分，再从结束位置继续截取下半部分。截完多节后，合并编辑器会在同一页面显示这些分节，用户可以逐节调整裁切、缩放和分页线，也可以将当前节参数套用到全部分节。最终可以导出分页 PNG、分页 JPEG 或合并 PDF。

关于分页和 PDF 导出：
用户可以直接使用自动分页，也可以开启自定义分页线来控制每一页的内容范围。对于 PDF 导出，插件会提供分页参考区和实时提醒，帮助用户减少页面过长、过短导致的压缩、拉伸或明显留白问题。若用户希望获得更稳定的 PDF 效果，也可以先导出分页 PNG 图片，再使用这些图片合并为 PDF。

关于超长页面预览：
当页面特别长时，结果页或合并编辑器中的工作区预览可能会为了浏览器性能而自动缩放，所以预览看起来模糊是正常现象。分页 PNG、分页 JPEG 和分页 PDF 会使用原始截图切片逐页渲染，不会因为工作区预览被缩放而降低分页导出的清晰度。

注意：
插件不能直接在微信 App 内置浏览器中运行。需要保存微信公众号文章时，请先用默认浏览器打开文章，或复制文章链接到 Chrome、Edge、Atlas 等 Chromium 浏览器中使用。

隐私说明：
XF FullPage Capture 采用本地优先设计。截图数据、编辑草稿和本地缓存保存在浏览器扩展的本地存储中，不会上传到任何外部服务器。

项目主页：
https://github.com/Yifo98/XF-FullPage-Capture


English Description:

What's new:

XF FullPage Capture 1.0.1 is a usability update focused on custom page-break lines, shortcut guidance, and loading feedback in the normal result page and the section merge editor.

Custom page-break editing is now easier to use. Page-break lines are thinner so they cover less page content, while keeping a practical drag area so users can drag them inside the crop area. The selected line is highlighted, and users can delete it with Delete or Backspace.

PDF reference zones are now visually lighter. They still help users judge whether a page range is too tall, too short, or close to the paper reference size, but they no longer cover the captured content as heavily.

The custom pagination workflow is clearer. The UI now suggests selecting the useful content area first, removing sidebars and blank areas, and then enabling custom page-break lines. Once custom pagination is enabled, the editor shows the available shortcuts: A, +, or = to add a page-break line, and Delete or Backspace to delete the selected line.

Shortcut hints are now visually consistent across the normal result page, the section merge editor, and the extension popup. The popup shows clearer keyboard-style hints for Enter, Esc, and Alt+Shift+S. The result page and merge editor show a stronger custom pagination shortcut hint inside the pagination controls.

Loading feedback has also been improved. When the result page or merge editor needs to read, stitch, or process multiple long screenshot slices, the UI now shows a left-to-right looping loading animation so users know the extension is still working.

Version 1.0.1 keeps the core features introduced in 1.0.0, including section management, the section merge editor, paginated PNG ZIP export, paginated JPEG ZIP export, merged PDF export, crop export, custom page-break lines, PDF reference zones, PDF distortion warnings, segmented long-page capture, continuing from the previous end position, safe waiting when switching tabs, Esc or Alt+Shift+S to stop capture, and local cache management.

Usage note:
If a page is captured fully in one pass, users can usually crop, paginate, and export directly from the normal result page. The merge editor is mainly useful when the first capture does not include the whole page, or when multiple captured sections need to be adjusted and exported together.

Full description:

XF FullPage Capture is a local-first full-page screenshot, cropping, pagination, and section merge export tool for Chromium-based browsers.

It helps users capture complete web pages, preview the result locally, crop the area they want to keep, adjust page breaks, and export the final result as PNG, JPEG, paginated images, or PDF.

It is useful for saving long web pages, online documents, knowledge base pages, tutorials, research materials, receipts, web reports, WeChat Official Account articles opened in a Chromium browser, and other pages that do not fit in a normal screen capture.

Users can capture the current page immediately, start capturing from the current scroll position, or choose custom start and end points. After capture, the result page lets users crop the export area, adjust export scale, customize page breaks, and export full images, paginated images, or PDF files.

For pages that are too long to capture in one pass, users can continue from the previous end position and capture the remaining content as another section. The merge editor can then display the selected sections together, let users adjust each section separately, and export them as paginated PNG, paginated JPEG, or a merged PDF.

Main features:

Capture full web pages and online document pages
Handle inner scrollable areas when possible
Capture WeChat Official Account articles opened in a Chromium browser
Capture immediately, start from the current scroll position, or choose custom start and end points
Preview captures locally before export
Crop the export area by dragging or resizing the selection frame
Customize page-break lines for cleaner paginated output
Add, move, select, and delete custom page-break lines
Use keyboard shortcuts to add or delete page-break lines
Show PDF page reference zones and distortion warnings
Export PNG, JPEG, paginated PNG, paginated JPEG, and paginated PDF files
Capture very long pages in sections and continue from the previous end position
Manage, reorder, and merge captured sections
Adjust crop, export scale, and page breaks separately for each section
Export cross-section paginated PNG ZIP, paginated JPEG ZIP, and merged PDF
Pause safely when the user switches away from the source tab during capture
View and delete local capture cache

About section merging:
Section merging is mainly for very long pages that cannot be captured completely in one pass. Users can capture the first part, continue from the previous end position, and then open the merge editor after multiple sections are available. In the merge editor, each section can be adjusted independently or synchronized with the current section's settings. The final output can be a paginated PNG ZIP, paginated JPEG ZIP, or one merged PDF.

About PDF export:
Custom page-break lines help users control where each page is split. For PDF export, XF FullPage Capture provides page reference zones and real-time warnings to reduce the risk of compression, stretching, or excessive blank space. For the most stable PDF result, users can also export paginated PNG images first and then merge those images into a PDF.

About long-page preview quality:
For very long captures, the workspace preview may be downscaled to keep the browser responsive. A slightly blurred preview is normal. Paginated PNG, paginated JPEG, and paginated PDF exports are rendered from the original screenshot slices, so the paginated export quality is not reduced by preview downscaling.

Note:
This extension cannot run inside the WeChat app's built-in browser. To capture a WeChat Official Account article, open the article in the default browser or copy the article URL into Chrome, Edge, Atlas, or another Chromium-based browser before using the extension.

Privacy:
XF FullPage Capture is local-first. Screenshot data, editing drafts, and local cache are stored in the browser extension's local storage and are not uploaded to any external server.

Project homepage:
https://github.com/Yifo98/XF-FullPage-Capture
