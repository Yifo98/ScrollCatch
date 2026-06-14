中文说明：

本次更新：

XF FullPage Capture 1.0.0 重点增加了分节截图管理和分节合并编辑器，适合处理一次无法完整截完的超长文章、在线文档、知识库页面和资料页面。用户可以把同一篇长页面分成多节截取，再在同一个编辑器中统一分页、裁切、调整和导出。

新版新增了分节管理流程。对于特别长的页面，插件会按单段上限捕获，避免强行生成超长画布导致浏览器卡顿、空白或导出失败。到达上限后，用户可以先导出当前段，也可以从上次结束位置继续截取下一段。截取多节后，结果页会列出可用分节，用户可以勾选、排序并进入合并编辑器。

新版新增了分节合并编辑器。合并编辑器会在同一页面显示多个已截取分节，支持双列对比、单列浏览、自动排列、预览缩放和适配宽度。用户可以分别选择每一节，并对每一节单独调整裁切区域、导出缩放和自定义分页线；也可以将当前节参数一键套用到全部分节。

新版增加了跨分节导出能力。合并编辑器支持将多节截图按顺序导出为分页 PNG ZIP、分页 JPEG ZIP 或合并 PDF。导出时会使用每一节的原始截图切片重新渲染，不依赖工作区中的降采样预览，因此长图预览略微模糊不会影响最终分页导出质量。

新版优化了自定义分页线体验。合并编辑器中的分页线更粗、更明显，鼠标悬停时会显示拖拽光标，选中的分页线会高亮显示。用户可以使用“页面范围”查看全部 PDF 参考区、只查看选中分页线附近的参考区，或隐藏范围提示，便于判断某一页内容是否偏长、偏短或接近纸张范围。

新版增加了更清楚的加载和性能提示。进入合并编辑器时，如果需要读取和拼接多节长图，界面会显示加载提示，避免用户误以为程序无响应。缓存区域也会显示本次分节缓存大小，并支持导出后自动清理或手动清理本次分节缓存。

新版保留并延续了此前版本的主要能力，包括立即截图、从当前位置开始截图、自定义起点/终点截图、超长页面分段截取、截图时切换标签页暂停等待、Esc 或 Alt + Shift + S 停止截图、裁切导出、自定义分页线、PDF 参考区、PDF 变形风险提示、分页 PNG、分页 JPEG、分页 PDF、历史截图缓存查看与删除等。

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


English Description:

What's new:

XF FullPage Capture 1.0.0 adds section management and a section merge editor for very long pages that cannot be captured comfortably in one pass. It is designed for long articles, online documents, knowledge base pages, research materials, and other pages that may need to be captured in multiple sections.

The extension now provides a safer segmented capture workflow. When a page is too long, XF FullPage Capture captures it within a practical section limit instead of forcing the browser to create an extremely tall canvas. After a section is complete, users can export the current result or continue capturing from the previous end position.

The new section merge editor lets users manage multiple captured sections in one place. It supports side-by-side comparison, single-column browsing, automatic layout, preview zoom, and fit-to-width viewing. Each section can be adjusted independently, including crop area, export scale, and custom page-break lines. Users can also apply the current section's settings to all sections when they want a consistent layout.

Version 1.0.0 adds cross-section export. The merge editor can export selected sections as a paginated PNG ZIP, paginated JPEG ZIP, or one merged PDF. Exports are rendered from the original screenshot slices, not from the downscaled workspace preview, so preview blur does not reduce the quality of paginated output.

Custom page-break editing has also been improved. Page-break lines in the merge editor are thicker, easier to see, and easier to drag. Hovering over a page-break line shows a drag cursor, and the selected line is highlighted. Users can show all PDF reference zones, show only the selected page-break range, or hide range hints.

The merge editor now shows clearer loading and performance feedback. When multiple long sections are being loaded and stitched for preview, the interface displays a loading message so users know the extension is still working. The cache area also shows the estimated size of the current section cache and supports manual cleanup or automatic cleanup after export.

Version 1.0.0 keeps the main features from earlier releases, including immediate capture, start-from-current-position capture, custom start/end range capture, segmented long-page capture, safe waiting when switching tabs, Esc or Alt + Shift + S to stop capture, crop export, custom page-break lines, PDF reference zones, distortion warnings, paginated PNG, paginated JPEG, paginated PDF, and local cache management.

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
