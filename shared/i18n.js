(() => {
  "use strict";

  const STORAGE_KEY = "scrollCatch:locale";
  const LEGACY_STORAGE_KEY = "xfFullPageCapture:locale";
  const DEFAULT_LOCALE = "en";
  const SUPPORTED_LOCALES = new Set(["zh-CN", "en"]);

  const EN = {
    "ScrollCatch 编辑工作台": "ScrollCatch Edit Workbench",
    "ScrollCatch · 收": "ScrollCatch · 收",
    "收其全貌，存其有度。": "Capture the whole, preserve with restraint.",
    "A QIDU Utility": "A QIDU Utility",
    "把整页，完整带走": "Capture the whole page",
    "截图操作": "Capture actions",
    "截取完整页面": "Capture full page",
    "从顶部开始，自动滚动并拼接": "Start at the top, scroll and stitch automatically",
    "从当前位置": "From current position",
    "继续向下捕获": "Continue capturing downward",
    "框选范围": "Select a range",
    "只保留需要的部分": "Keep only what you need",
    "停止并保留已截内容": "Stop and keep captured content",
    "正在检查当前页面...": "Checking the current page...",
    "截图提示与快捷键": "Capture tips and shortcuts",
    "PPT 预览会按左侧页码逐页捕获；普通网页按滚动位置拼接。": "PPT previews are captured page by page; regular pages are stitched by scroll position.",
    "图片很多的长页面，先滚到底部完成预加载会更稳。": "For image-heavy long pages, preload by scrolling to the bottom first.",
    "选好起点后截到结尾": "Capture to the end after choosing a start",
    "停止并保留已截内容": "Stop and keep captured content",
    "切到其他标签后停止": "Stop after switching tabs",
    "停止失败。": "Could not stop capture.",
    "框选已取消。": "Range selection cancelled.",
    "已请求停止，正在导出已截部分。": "Stop requested. Exporting the captured portion.",
    "当前标签没有正在进行的截图。": "No capture is running in this tab.",
    "没有可截图的当前标签。": "There is no capturable active tab.",
    "正在截图。按 Esc 或点击停止，导出已截部分。": "Capturing. Press Esc or click Stop to export the captured portion.",
    "启动截图失败。": "Could not start capture.",
    "检测到飞书页面。打开 PPT 预览后按页捕获，普通文档按页面滚动捕获。": "Feishu detected. Open a PPT preview for page capture; documents use scrolling capture.",
    "选择捕获方式。网页按滚动捕获，PPT 预览按页捕获。": "Choose a capture mode. Web pages use scrolling; PPT previews use page capture.",
    "在页面上标记起点和终点，也可以按 Enter 直接截到页面结尾。": "Mark a start and end on the page, or press Enter to capture to the page end.",
    "已从当前可见位置开始捕获。": "Capture started from the current visible position.",
    "已开始捕获完整页面。PPT 按页捕获，网页滚动拼接。": "Full-page capture started. PPTs use page capture; web pages are stitched by scrolling.",

    "正在整理截图": "Preparing capture",
    "等待后台传回截图切片...": "Waiting for capture slices...",
    "快速结果": "Quick result",
    "先确认截图，再选择下一步": "Review the capture, then choose what to do next",
    "这里只负责确认结果、续接长页和快速保存。需要裁切、分页或整理多段时，再进入编辑工作台。": "Review the result, continue long pages, or save quickly here. Open the workbench for cropping, pagination, and section management.",
    "当前快速导出会沿用已保存的选区或分页设置；进入编辑工作台可查看和修改。": "Quick export uses the saved crop and pagination settings. Open the workbench to review or change them.",
    "原文与续截": "Source and continuation",
    "本次截图已完成。": "This capture is complete.",
    "可以随时回到原文。": "You can return to the source at any time.",
    "长页截图进度": "Long-page capture progress",
    "回到原文": "Back to source",
    "查看结束位置": "View end position",
    "继续截取下一段": "Capture next section",
    "保存与精修": "Save and refine",
    "下一步": "Next step",
    "推荐下一步": "Recommended next step",
    "进入编辑工作台精细处理": "Open the workbench for precision editing",
    "在工作台中查看完整截图，并继续裁切、自定义分页或合并导出。": "Review the complete capture in the workbench, then crop, add custom page breaks, or combine and export.",
    "推荐进入编辑工作台，完成裁切、分页和 PDF 导出。": "Open the workbench to crop, paginate, and export a PDF.",
    "进入编辑工作台": "Open edit workbench",
    "可进行": "Available tools",
    "自由裁切、自定义分页，并将连续分段合并成一个 PDF。": "Free crop, custom pagination, and combining continuous sections into one PDF.",
    "推荐": "Recommended",
    "在工作台中自由裁切、自定义分页，并将连续分段合并导出为一个 PDF。": "Crop freely, add custom page breaks, and combine continuous sections into one PDF in the workbench.",
    "截图确认无误后，可以直接保存 PNG。": "Once the capture looks right, save it directly as PNG.",
    "保存 PNG": "Save PNG",
    "保存整张 PNG": "Save full PNG",
    "保存当前段 PNG": "Save current section PNG",
    "编辑工作台": "Edit workbench",
    "编辑工作台用于裁切、分页、多段组合和高级导出。": "Use the workbench for cropping, pagination, combining sections, and advanced export.",
    "更多导出格式": "More export formats",
    "保存 JPEG": "Save JPEG",
    "保存当前段 JPEG": "Save current section JPEG",
    "导出 PDF": "Export PDF",
    "导出当前段 PDF": "Export current section PDF",
    "保存当前段 PDF": "Save current section PDF",
    "保存 PDF": "Save PDF",
    "每页 PNG": "PNG pages",
    "每页 JPEG": "JPEG pages",
    "导出每页 PNG": "Export each page as PNG",
    "导出每页 JPEG": "Export each page as JPEG",
    "添加其他截图": "Add other captures",
    "自动续截会直接整理好；旧版缓存或手动分段可以在这里补选。": "Automatic continuations are organized for you. Add older cached or manually captured sections here.",
    "刷新列表": "Refresh list",
    "进入多段模式": "Open multi-section mode",
    "进入多段编辑模式": "Open multi-section editing",
    "上移": "Move up",
    "下移": "Move down",
    "适用于旧版缓存、从当前位置手动截出的分段，或需要自行组合的 PPT 截图；自动续截通常不需要打开这里。": "Use this for older caches, manual sections, or PPT captures you want to combine. Automatic continuations usually need no changes.",
    "分页": "Paginate",
    "分页线会显示在右侧预览里。工作区预览会优先保持流畅，局部模糊不影响分页导出的最终清晰度。": "Page breaks appear in the preview. The workspace favors responsiveness; soft preview areas do not reduce export quality.",
    "高级 PDF 参数": "Advanced PDF settings",
    "纸张": "Paper",
    "方向": "Orientation",
    "竖版": "Portrait",
    "横版": "Landscape",
    "页脚显示页码和时间": "Show page number and time in footer",
    "导出清晰度": "Export quality",
    "预览": "Preview",
    "预览缩放": "Preview zoom",
    "适配当前宽度": "Fit current width",
    "选区": "Crop",
    "使用选区导出": "Export selected area",
    "裁切区域": "Crop area",
    "宽": "Width",
    "高": "Height",
    "全图": "Full image",
    "当前视图": "Current view",
    "裁切到当前可见区域": "Crop to visible area",
    "只留当前画面": "Keep current view",
    "启用自由裁切": "Enable free crop",
    "拖动边框选择保留范围；“当前可见区域”只保留屏幕中当前能看到的截图范围。": "Drag the border to choose what to keep. Visible area keeps only the part currently shown on screen.",
    "拖动边框自由选择范围；“只留当前画面”仅保留预览区此刻看到的部分。": "Drag the border to choose what to keep. Keep current view retains only the part visible in the preview right now.",
    "当前裁切：全图": "Current crop: Full image",
    "自定义分页": "Custom pagination",
    "自定义分页线": "Custom page breaks",
    "使用自定义分页线": "Use custom page breaks",
    "建议先框选要保留的内容范围，去掉边栏和空白，再开启自定义分页线。": "Crop the content first to remove sidebars and empty space, then enable custom page breaks.",
    "自定义分页会按每段内容缩放到 PDF 页面；如果某一页过长、过短或分页线过密，导出的 PDF 可能出现内容挤压、留白或比例不理想。": "Custom pages scale each section to the PDF page. Very long, short, or tightly spaced pages may look compressed or leave extra whitespace.",
    "开启自定义分页线后，会在右侧显示 PDF 参考区。": "Enable custom page breaks to show PDF reference areas in the preview.",
    "按纸张生成": "Generate from paper size",
    "新增分页线": "Add page break",
    "删除选中线": "Delete selected break",
    "清除分页线": "Clear page breaks",
    "快捷键": "Shortcuts",
    "分页快捷键": "Pagination shortcuts",
    "新增": "Add",
    "可拖动分页线；A / + 新增；Delete 删除选中线。": "Drag a page break to move it; A / + adds one; Delete removes the selected break.",
    "开启后显示 PDF 参考区。": "Shows PDF reference areas when enabled.",
    "开启自定义分页线后可用：A / + / = 新增分页线；Delete / Backspace 删除选中线。": "When custom pagination is enabled: A / + / = adds a break; Delete / Backspace removes the selected break.",
    "自动分页。": "Automatic pagination.",
    "缓存": "Cache",
    "正在读取缓存大小...": "Reading cache size...",
    "导出后自动清理本次截图缓存": "Clear this capture cache after export",
    "导出后自动删除本次截图缓存": "Delete these capture caches after export",
    "完成连续截图并合并导出后，自动删除全部截图缓存": "Delete all capture caches after the continuous capture is combined and exported",
    "为保持续截和后续合并，已保留当前分段缓存。": "The current section cache was kept for continuation and later merging.",
    "已删除本次缓存。": "This capture cache was deleted.",
    "刷新大小": "Refresh size",
    "清理本次截图缓存": "Clear this capture cache",
    "初始化中...": "Initializing...",
    "诊断信息": "Diagnostics",
    "页面与插件运行信息": "Page and extension runtime information",
    "截图预览": "Screenshot preview",
    "连续截图完整预览": "Complete continuous capture preview",
    "低清完整预览": " lightweight complete preview",
    "这一段暂时无法生成预览，可进入编辑工作台重试。": "This section preview is temporarily unavailable. Open the workbench to retry.",
    "正在准备第一段预览": "Preparing the first preview section",
    "先显示已完成的内容，后续切片会继续补齐。": "Completed content appears first while remaining slices continue loading.",
    "正在处理...": "Working...",
    "长图处理可能需要一点时间，请稍等。": "Long captures can take a little while.",
    "预览暂时无法打开": "Preview could not be opened",
    "截图数据读取失败。可返回原页面重新截取，或稍后重试。": "Capture data could not be read. Return to the source and capture again, or retry later.",

    "整理": "Arrange",
    "精修": "Refine",
    "导出": "Export",
    "已自动保存": "Auto-saved",
    "中文": "Chinese",
    "English": "English",
    "返回快速结果": "Back to quick result",
    "分段": "Sections",
    "当前编辑段": "Current section",
    "管理分段": "Manage sections",
    "管理与排序": "Manage and reorder",
    "添加截图、调整组合顺序": "Add captures and reorder the set",
    "上移当前段": "Move up",
    "下移当前段": "Move down",
    "添加或排除截图": "Add or exclude captures",
    "自动续截已整理好；如有重复、坏段或独立 PPT 截图，可在这里调整组合。": "Automatic continuations are organized. Adjust the set here if there are duplicates, bad sections, or standalone PPT captures.",
    "自动续截会直接进入当前组合；历史截图和独立 PPT 截图可在这里添加或排除。": "Automatic continuations join the current set. Add or exclude historical and standalone PPT captures here.",
    "其他历史截图": "Other historical capture",
    "应用组合": "Apply selection",
    "精细修剪": "Precision trim",
    "裁切、分页与像素级调整": "Crop, paginate, and make pixel-level adjustments",
    "自由裁切": "Free crop",
    "工作台核心工具": "Workbench core tools",
    "拖动画布选择保留范围，也可以直接截取当前可见区域。": "Drag on the canvas to choose what to keep, or use the current visible area.",
    "恢复全图": "Restore full image",
    "排除此段": "Exclude this section",
    "同步应用到全部": "Sync to all sections",
    "预览设置": "Preview settings",
    "进入像素级修剪": "Open pixel-level trim",
    "应用到全部 2 段": "Apply to all 2 sections",
    "使用自由裁切": "Use free crop",
    "精确数值": "Precise values",
    "高级导出清晰度": "Advanced export quality",
    "将当前设置应用到全部": "Apply current settings to all",
    "预览方式": "Preview mode",
    "只为当前分段加载高清预览；切换时会短暂准备，其他分段保持轻量待命。": "Only the active section loads a high-resolution preview. Other sections stay lightweight.",
    "布局": "Layout",
    "双列对比": "Two-column comparison",
    "单列浏览": "Single-column view",
    "自动排列": "Automatic layout",
    "连续截图": "Continuous captures",
    "直接新增、拖动或删除 PDF 分页位置。": "Add, drag, or delete PDF page breaks directly.",
    "按左侧顺序合并全部保留分段。": "Combine all included sections in the order shown on the left.",
    "合并导出 PDF": "Combine and export PDF",
    "更多格式与设置": "More formats and settings",
    "更多导出与缓存": "More export and cache options",
    "不导出或直接关闭页面时，缓存仍会保留；最多保留最近 12 次截图，可在下方查看大小或手动清理。": "If you close without exporting, the cache remains. Up to the 12 most recent captures are kept; view the size or clear them below.",
    "不导出或直接关闭页面时，缓存仍会保留；最多保留最近 12 次截图，可在这里查看大小或手动清理。": "If you close without exporting, the cache remains. Up to the 12 most recent captures are kept; view the size or clear them here.",
    "导出前同步当前设置": "Sync current settings before export",
    "同步全部设置": "Sync all settings",
    "导出后清理缓存": "Clear cache after export",
    "导出后清理本次组合缓存": "Clear this capture set after export",
    "不导出或直接关闭页面时，缓存仍会保留。导出后只清理本次导出的分段；其他历史截图仍会保留。浏览器最多保留最近 12 次截图，可在这里手动清理。": "If you close without exporting, caches remain. Export cleanup only removes the sections exported this time. Other historical captures remain. The browser keeps the 12 most recent captures, which can be cleared here.",
    "清理其他历史缓存": "Clear other history",
    "没有需要清理的其他历史缓存。": "There are no other historical caches to clear.",
    "正在清理其他历史缓存...": "Clearing other historical caches...",
    "导出设置": "Export settings",
    "导出完成": "Export complete",
    "PDF 已保存": "PDF saved",
    "合并 PDF 已保存": "Combined PDF saved",
    "截图缓存已清理，本工作台将不再支持二次编辑。你可以直接返回原文。": "The capture cache was cleared, so this workbench can no longer be edited. You can return to the source.",
    "截图缓存已清理，本工作台将不再支持二次编辑。建议现在返回原文，需要时可重新截图。": "The capture cache was cleared, so this workbench can no longer be edited. Return to the source now and recapture if needed.",
    "截图缓存已清理，本工作台将不再支持二次编辑。可以返回快速结果或关闭此页。": "The capture cache was cleared, so this workbench can no longer be edited. Return to the quick result or close this page.",
    "截图缓存已清理，本工作台将不再支持二次编辑。可以关闭此页。": "The capture cache was cleared, so this workbench can no longer be edited. You can close this page.",
    "关闭此页": "Close this page",
    "连续截图的多个分段已经自动整理好，可以在这里统一调整、分页和导出。": "Continuous capture sections are organized and ready for adjustment, pagination, and export.",
    "分页 PNG": "Paged PNG",
    "分页 JPEG": "Paged JPEG",
    "显示全部 PDF 参考区": "Show all PDF reference areas",
    "只看选中分页线": "Show selected page break only",
    "隐藏页面范围": "Hide page ranges",
    "页面范围": "Page range",
    "开启自定义分页线后，预览里会显示 PDF 参考区。": "Enable custom page breaks to show PDF reference areas in the preview.",
    "Section previews": "Section previews",
    "正在加载连续截图...": "Loading continuous captures...",
    "长图预览需要读取多张切片，请稍等，不影响最终导出清晰度。": "Long previews read multiple slices. This does not reduce final export quality.",
    "暂无可添加的截图缓存。": "No cached captures are available.",
    "暂无可添加的其他截图。": "No other captures are available.",
    "未命名截图": "Untitled capture",
    "当前组合": "Current set",
    "可添加": "Available",
    "至少保留一段截图才能继续编辑。": "Keep at least one capture section to continue editing.",
    "截图段": "Capture section",
    "预览加载失败": "Preview failed to load",
    "正在加载高清预览": "Loading high-resolution preview",
    "轻量待命": "Lightweight standby",
    "点击此分段可重试": "Click this section to retry",
    "只处理当前分段，请稍等": "Preparing only the current section",
    "点击加载此段；已访问的分段会保留低清对照": "Click to load this section. Visited sections keep a lightweight reference.",
    "高清编辑": "High-resolution editing",
    "低清对照": "Lightweight reference",
    "准备中": "Preparing",
    "当前分段": "Current section",
    "全部分段": "All sections",
    "仅当前段": "Current section only",
    "全部 2 段": "All 2 sections",
    "高清导出使用原始截图": "High-resolution export uses original captures",
    "没有可导出的截图段。": "There are no capture sections to export.",
    "没有可合并的截图段。": "There are no capture sections to combine.",
    "至少保留一个截图段。": "Keep at least one capture section.",
    "暂无可统计的截图缓存。": "No capture cache is available to measure.",
    "PDF参考区": "PDF reference area",
    "当前段分页线在 PDF 参考区内。": "The current section's page breaks fit the PDF reference area.",
    "PPT 已按截图页分页，不使用网页截图的 PDF 参考区。": "PPT capture uses slide boundaries instead of web-page PDF reference areas.",
    "自动分页": "Auto pagination",
    "偏短": "Short",
    "偏长": "Long",
    "鼠标位置": "pointer position",
    "当前可见区域中心": "visible-area center",
    "最大空段中心": "largest-gap center",
    "取消": "Cancel",
    "标记起点": "Mark start",
    "标记终点": "Mark end",
    "截到页面结束": "Capture to page end",
    "移动鼠标定位，点击页面正文或“标记起点”；Esc 取消": "Move the pointer, click the page or Mark start; press Esc to cancel",
    "已标记起点。可以滚动页面，再点击页面正文或“标记终点”；按 Enter 截到页面结束，Esc 取消": "Start marked. Scroll, then click the page or Mark end; press Enter to capture to the end or Esc to cancel",
    "请先标记起点。": "Mark a start point first.",
    "终点要在起点下方。可以继续滚动页面，再点击页面正文或“标记终点”；或按 Enter 截到页面结束": "The end must be below the start. Keep scrolling, then click the page or Mark end; or press Enter to capture to the page end",
    "未知页": "unknown page",
    "当前页面不允许扩展截图。请换到普通网页、飞书文档或 PPT 预览页后再试。": "This page does not allow extension capture. Try a regular web page, Feishu document, or PPT preview.",
    "截图未完成：PPT 预览器没有成功跳到目标页。": "Capture was not completed because the PPT viewer could not reach the target page.",
    "可以先点击左侧缩略图切到目标页后重试，或选择“从当前位置捕获”。": "Select the target slide from the left thumbnail rail and retry, or choose Capture from current position.",
    "，该段未找到草稿，使用完整范围": ", no draft was found for this section, so the full range is used",
    "按页捕获": "Page-by-page capture",
    "本次截图缓存已经删除。": "This capture cache has already been deleted.",
    "本次截图缓存已删除，当前预览仍可查看，但不能再次高清导出。": "This capture cache was deleted. The current preview remains available, but high-resolution export is no longer possible.",
    "本次截图缓存已删除；当前预览仍可查看，但不能再次高清导出。": "This capture cache was deleted. The current preview remains available, but high-resolution export is no longer possible.",
    "本页已完成截图。": "This page capture is complete.",
    "查看缓存": "View cache",
    "打开": "Open",
    "当前": "Current",
    "当前 ·": "Current ·",
    "当前段已选；再选择至少一个截图段即可进入多段模式。": "The current section is selected. Select at least one more section to open multi-section mode.",
    "当前分页线按 PPT 截图页边界生成；导出分页 PNG、分页 JPEG 或 PDF 时会按这些页边界输出。": "Page breaks follow PPT capture boundaries and are used for paged PNG, paged JPEG, and PDF exports.",
    "当前分页线按选区、纸张方向和导出缩放自动生成；继续调整选区时会同步重算。": "Page breaks are generated from the crop, paper orientation, and export scale, and update when the crop changes.",
    "当前分页线已经太密，暂时不能继续新增。": "The page breaks are too close together to add another one.",
    "当前分页线已手动编辑；调整选区后会刷新风险提示，不会覆盖你手动挪好的分页线。": "Page breaks were edited manually. Crop changes update risk notices without replacing your break positions.",
    "当前分页线在 PDF 参考区内。若要彻底避开直接 PDF 缩放风险，可以先导出分页 PNG ZIP，再用图片合并 PDF。": "Page breaks fit the PDF reference area. To avoid direct PDF scaling, export a paged PNG ZIP and combine the images into a PDF.",
    "当前画布保持可见；在这里输入像素级裁切范围。": "The canvas stays visible while you enter pixel-precise crop values here.",
    "当前截图没有可定位的结束位置。": "This capture has no saved end position.",
    "当前截图没有可返回的原文地址。": "This capture has no source URL to return to.",
    "当前截图没有可继续获取的结束位置。": "This capture has no end position available for continuation.",
    "原文页面已重新打开，但长内容还没有恢复到保存的位置。": "The source page reopened, but its long content was not ready at the saved position.",
    "原文标签页已关闭，并且无法重新打开该页面。": "The original source tab is closed and its page cannot be reopened.",
    "当前可见区域没有覆盖截图画布。": "The visible area does not overlap the capture canvas.",
    "当前可用：拖动分页线调整位置；A / + / = 新增；Delete / Backspace 删除选中线。": "Available now: drag to move a break; A / + / = adds one; Delete / Backspace removes the selected break.",
    "当前可用：拖动分页线调整位置；A / + / = 在当前可见区域新增分页线。": "Available now: drag to move a break; A / + / = adds one in the visible area.",
    "当前可用：拖动分页线调整位置；A / + / = 在鼠标位置新增分页线。": "Available now: drag to move a break; A / + / = adds one at the pointer.",
    "当前页": "Current page",
    "导出后自动删除本次缓存": "Delete this capture cache after export",
    "到达本段上限": "Section limit reached",
    "到达自定义终点": "Custom end reached",
    "等待页面加载信息...": "Waiting for page load information...",
    "调整顺序，或加入、排除其他截图。": "Reorder sections, or add and exclude other captures.",
    "丢弃恢复": "Discard recovery",
    "独立截图": "Standalone capture",
    "分页 JPEG ZIP 已交给浏览器下载，并已删除本次缓存。": "The paged JPEG ZIP was sent to the browser and this capture cache was deleted.",
    "分页 JPEG ZIP 已交给浏览器下载。": "The paged JPEG ZIP was sent to the browser.",
    "分页 PNG ZIP 已交给浏览器下载，并已删除本次缓存。": "The paged PNG ZIP was sent to the browser and this capture cache was deleted.",
    "分页 PNG ZIP 已交给浏览器下载。": "The paged PNG ZIP was sent to the browser.",
    "分页设置": "Pagination settings",
    "分页线在 PDF 参考区内。": "Page breaks fit the PDF reference area.",
    "分页线在 PDF 参考区内。若要彻底避开直接 PDF 缩放风险，可以先导出分页 PNG ZIP 再合并 PDF。": "Page breaks fit the PDF reference area. To avoid direct PDF scaling, export a paged PNG ZIP before combining it into a PDF.",
    "根据当前裁切与分页设置生成文件。": "Generate files using the current crop and pagination settings.",
    "关闭": "Close",
    "关闭结果页后，本次截图缓存仍会暂存在浏览器本机，可在这里查看或删除。": "The capture cache remains on this device after closing the result page. View or delete it here.",
    "关闭结果页后，本次截图缓存仍会暂存在浏览器本机。": "The capture cache remains on this device after closing the result page.",
    "合并 PDF 已交给浏览器下载。": "The combined PDF was sent to the browser.",
    "缓存与截图段列表暂时未能刷新，不影响当前预览和导出。": "The cache and section lists could not be refreshed. Preview and export still work.",
    "会按当前选区和分页线逐页渲染高清图片。": "High-resolution images will be rendered page by page from the current crop and page breaks.",
    "会使用当前选区和最新分页线重新渲染。": "The current crop and latest page breaks will be rendered again.",
    "截图": "Capture",
    "截图段列表已刷新。": "The capture section list was refreshed.",
    "截图还没有完成拼接，暂时不能导出。": "The capture has not finished composing and cannot be exported yet.",
    "截图还没有完成拼接，暂时不能新增分页线。": "The capture has not finished composing, so a page break cannot be added yet.",
    "截图内容会逐段出现，不必等完整长图拼接完。": "Capture content appears section by section; you do not need to wait for the full long image.",
    "截图内容仍在准备中；可以先回到原文，完成后再进入单段精修。": "The capture is still being prepared. You can return to the source now and open single-section refinement when it is ready.",
    "截图确认无误后可直接保存 PNG；需要更小文件、PDF 或精修时再展开。": "Save PNG directly when the capture looks right. Expand for a smaller file, PDF, or refinement.",
    "界面语言": "Language",
    "预览提示": "Preview note",
    "为保证编辑流畅，当前预览模糊属正常；导出仍使用原始截图，不影响最终清晰度。": "The preview may look slightly soft to keep editing responsive. Export still uses the original capture at full quality.",
    "截图缓存": "Capture cache",
    "缓存保存在浏览器本机。导出后只清理本次导出的分段，其他历史截图仍会保留。": "Caches stay on this device. Export cleanup removes only this exported set; other historical captures remain.",
    "清理当前组合": "Clear current set",
    "清理历史缓存": "Clear history",
    "清理当前组合缓存？清理后仍可查看已加载预览，但不能再次高清导出；刷新后也无法恢复这些截图。": "Clear the current set's cache? Loaded previews will remain visible, but high-resolution export will be unavailable and these captures cannot be restored after refresh.",
    "已清理当前组合缓存。当前预览仍可查看，但不能再次高清导出。": "The current set's cache was cleared. Loaded previews remain visible, but high-resolution export is no longer available.",
    "可返回结束位置": "End position available",
    "可以回到原文，或定位到本次截图的结束位置进行核对。": "Return to the source, or check the saved end position for this capture.",
    "可以随时回到原文；本次截图已经结束，不会误触发重复续截。": "You can return to the source at any time. This capture is complete and will not start a duplicate continuation.",
    "可以直接回到原文，也可以查看保存的衔接位置后继续截取。": "Return to the source, or review the saved handoff position before continuing.",
    "没有上次离开记录，可能是新打开、扩展重载或浏览器直接恢复": "No previous exit record. The page may be newly opened, reloaded with the extension, or restored by the browser",
    "没有找到可编辑的截图内容。": "No editable capture content was found.",
    "内层滚动容器": "Inner scroll container",
    "判断：来自历史记录或标签页恢复": "Assessment: restored from history or a tab session",
    "判断：浏览器执行了 reload；当前插件代码没有定时刷新调用": "Assessment: the browser reloaded the page; the extension has no scheduled reload call",
    "判断：新导航打开结果页": "Assessment: the result page opened through a new navigation",
    "清空缓存": "Clear cache",
    "清空所有截图缓存？清空后当前预览仍可查看，但当前页不能再次高清导出，历史结果页也无法恢复原始截图。": "Clear all capture caches? The current preview will remain visible, but this page can no longer export at high resolution and older result pages cannot restore their original captures.",
    "清理本次编辑用到的截图缓存？清理后仍可查看已加载预览，但不能再次高清导出；刷新后也无法恢复这些截图。": "Clear caches used in this edit? Loaded previews will remain visible, but high-resolution export will be unavailable and these captures cannot be restored after refresh.",
    "请至少选择两个截图段。": "Select at least two capture sections.",
    "缺少连续截图内容。请回到快速结果重新进入编辑工作台。": "Continuous capture content is missing. Return to Quick result and open the workbench again.",
    "如果原标签页已经关闭，会重新打开原文。": "If the original tab was closed, the source will reopen.",
    "删除": "Delete",
    "删除本次缓存": "Delete this cache",
    "删除本次截图缓存？删除后只能继续查看当前预览，不能再次高清导出；刷新后也无法恢复这次截图。": "Delete this capture cache? You can keep viewing the current preview, but high-resolution export will be unavailable and the capture cannot be restored after refresh.",
    "收起": "Collapse",
    "手动停止": "Stopped manually",
    "刷新诊断": "Refresh diagnostics",
    "所有截图缓存已清空。": "All capture caches were cleared.",
    "完整页面截图": "Full-page capture",
    "未开启": "Off",
    "未拼接": "Not composed",
    "未知": "Unknown",
    "先在右侧预览里选中一条自定义分页线。": "Select a custom page break in the preview first.",
    "演示稿已按页截取。可以保存整张预览，也可以在更多格式中逐页导出。": "The presentation was captured page by page. Save the full preview or export individual pages under More formats.",
    "这只是长页的当前分段。建议优先继续截取；如果只需要本段，也可以保存当前段 PDF。": "This is the current section of a long page. Continue capturing first, or save the current section as a PDF if that is all you need.",
    "推荐进入编辑工作台完成裁切和分页；也可以直接保存当前 PDF。": "Open the edit workbench for cropping and pagination, or save the current PDF directly.",
    "页面不再继续滚动": "The page stopped scrolling",
    "页面滚动": "Page scroll",
    "页面内容较多时需要读取多张切片，请稍等。": "Pages with more content require several slices. Please wait.",
    "页面内容较多时需要读取和拼接多张切片，请稍等。": "Pages with more content require several slices to be read and composed. Please wait.",
    "已把当前设置应用到全部分段；仍只保留当前高清预览。": "The current settings were applied to every section; only the active high-resolution preview remains loaded.",
    "已把当前设置同步到全部分段；仍只保留当前高清预览。": "The current settings were synced to every section; only the active high-resolution preview remains loaded.",
    "已保存": "Saved",
    "已编辑": "Edited",
    "已从保存的结束位置开始下一段截图。新结果会回到当前标签页。": "The next section started from the saved end position. Its result will return to this tab.",
    "已定位到本段结束位置。": "Moved to the end position of this section.",
    "已根据当前选区刷新分页参考。": "Pagination references were updated for the current crop.",
    "已回到原文。": "Returned to the source.",
    "已开启": "On",
    "已清理本次截图缓存。当前预览仍可查看，但不能再次高清导出。": "This capture cache was cleared. Loaded previews remain visible, but high-resolution export is no longer possible.",
    "已取消直接 PDF 导出。建议先导出分页 PNG ZIP，再用图片合并 PDF。": "Direct PDF export was cancelled. Export a paged PNG ZIP first, then combine the images into a PDF.",
    "已删除选中的分页线。": "The selected page break was deleted.",
    "已删除选中的截图缓存。": "The selected capture caches were deleted.",
    "已完成": "Complete",
    "已在当前可见区域新增分页线。": "A page break was added in the visible area.",
    "预览正在逐段出现；最终导出仍会使用原始切片。": "The preview is appearing section by section; final export still uses the original slices.",
    "暂无缓存截图。": "No cached captures.",
    "展开": "Expand",
    "这只是长页的当前分段。建议优先继续截取；如果只需要本段，也可以单独保存。": "This is the current section of a long page. Continue capturing first, or save this section alone if that is all you need.",
    "整理分段": "Arrange sections",
    "正在按当前选区渲染导出图片。": "Rendering export images from the current crop.",
    "正在把当前设置应用到全部分段...": "Applying the current settings to every section...",
    "正在从原始切片逐页渲染 PDF。": "Rendering the PDF page by page from original slices.",
    "正在从原始切片逐页渲染，预览模糊不会影响导出清晰度。": "Rendering each page from original slices. A soft preview does not reduce export quality.",
    "正在定位结束位置...": "Locating the end position...",
    "正在定位已保存的结束位置，然后启动下一段截图。": "Locating the saved end position, then starting the next capture section.",
    "正在读取各段信息，请稍等。": "Reading section information. Please wait.",
    "正在读取各段原始切片并写入 PDF。": "Reading original section slices and writing the PDF.",
    "正在读取连续截图和各自的编辑草稿。": "Reading continuous captures and their edit drafts.",
    "正在恢复原文并继续截取...": "Restoring the source and continuing capture...",
    "正在回到原文...": "Returning to the source...",
    "正在拼接截图切片...": "Composing capture slices...",
    "正在生成高清分页 JPEG ZIP...": "Generating a high-resolution paged JPEG ZIP...",
    "正在生成高清分页 PDF...": "Generating a high-resolution paged PDF...",
    "正在生成高清分页 PNG ZIP...": "Generating a high-resolution paged PNG ZIP...",
    "正在生成合并 PDF...": "Generating the combined PDF...",
    "正在同步当前裁切与分页设置，然后合并导出...": "Syncing the current crop and page breaks before combining the export...",
    "正在准备连续截图完整预览...": "Preparing the complete continuous capture preview...",
    "快速结果使用轻量预览；编辑和导出仍会读取原始截图。": "Quick result uses lightweight previews; editing and export still read the original captures.",
    "正在整理连续截图...": "Preparing continuous captures...",
    "正在准备当前分段预览...": "Preparing the active section preview...",
    "正在准备多段 PDF...": "Preparing the multi-section PDF...",
    "只读取各段尺寸信息，不会同时生成高清预览。": "Only section dimensions are read; high-resolution previews are not generated together.",
    "只加载当前分段的高清预览，其他分段会保持轻量待命。": "Only the active section loads a high-resolution preview; other sections remain lightweight.",
    "自定义单页。": "Custom single page.",
    "Chrome 标记为 wasDiscarded，通常是标签页被内存回收后恢复": "Chrome marked the page as wasDiscarded, usually after a tab was reclaimed from memory and restored",
    "PDF 已交给浏览器下载，并已删除本次缓存。": "The PDF was sent to the browser and this capture cache was deleted.",
    "PDF 已交给浏览器下载。": "The PDF was sent to the browser.",
    "PPT 会优先按截图页边界分页；普通网页可先框选范围再开启自定义分页线。": "PPT captures follow slide boundaries. For regular pages, crop first and then enable custom page breaks.",
    "截图缓存已失效，请重新截图。": "The capture cache has expired. Run the capture again.",
    "建议先导出分页 PNG ZIP，再用图片合并 PDF，可避开直接 PDF 的缩放变形风险。": "Export a paged PNG ZIP first, then combine the images into a PDF to avoid direct PDF scaling distortion.",
    "仍然直接导出分页 PDF？": "Export the paged PDF anyway?",
    "编辑阶段": "Editing stages",
    "工作台工具": "Workbench tools",
    "折叠分段栏": "Collapse section rail",
    "关闭精细修剪": "Close precision trim",
    "数值会跟随当前裁切框更新；输入后也会立即反映到截图上。": "Values follow the current crop box, and edits are reflected on the screenshot immediately.",
    "处理进度": "Processing progress",
    "页面窗口": "Page window",
    "PDF.js 页面窗口": "PDF.js page window",
    "文档 / PPT 页面窗口": "Document / PPT page window",
    "PPT 分页窗口": "PPT page window"
  };

  const EN_PATTERNS = [
    [/^已关联\s*(\d+)\s*段并在右侧完整显示。推荐进入编辑工作台同步裁切、分页并合并导出 PDF。$/, (_m, n) => `${n} linked sections are shown in full. Open the workbench to sync crops, paginate, and combine them into one PDF.`],
    [/^已清理\s*(\d+)\s*段缓存，但仍有\s*(\d+)\s*段失败。导出已锁定，请点击“清理本次截图缓存”重试。$/, (_m, done, failed) => `${done} section caches were cleared, but ${failed} failed. Export is locked; click Clear this capture cache to retry.`],
    [/^已清理\s*(\d+)\s*段缓存，但仍有\s*(\d+)\s*段失败。导出已锁定，请点击“清理当前组合”重试。$/, (_m, done, failed) => `${done} section caches were cleared, but ${failed} failed. Export is locked; click Clear current set to retry.`],
    [/^本次组合约\s*(.+)\s*·\s*另有\s*(\d+)\s*条历史截图。$/, (_m, size, count) => `Current set: about ${size} · ${count} historical captures.`],
    [/^正在按顺序读取\s*(\d+)\s*个分段。$/, (_m, n) => `Reading ${n} sections in order.`],
    [/^正在准备连续截图完整预览\s*(\d+)\/(\d+)\.\.\.$/, (_m, a, b) => `Preparing the complete continuous preview ${a}/${b}...`],
    [/^合并导出 PDF（(\d+)\s*段）$/, (_m, n) => `Combine and export PDF (${n} sections)`],
    [/^导出 PDF（(\d+)\s*段）$/, (_m, n) => `Export PDF (${n} sections)`],
    [/^第\s*(\d+)\s*段$/, (_m, n) => `Section ${n}`],
    [/^(\d+)\s*段$/, (_m, n) => `${n} sections`],
    [/^(\d+)\s*页$/, (_m, n) => `${n} pages`],
    [/^(\d+)\s*张切片$/, (_m, n) => `${n} slices`],
    [/^第\s*(\d+)\s*页$/, (_m, n) => `Page ${n}`],
    [/^PPT 第\s*(\d+)\s*页$/, (_m, n) => `PPT page ${n}`],
    [/^第\s*(\d+)\s*页 · 偏长，PDF 可能缩小$/, (_m, n) => `Page ${n} · Too long; PDF may shrink`],
    [/^第\s*(\d+)\s*页 · 偏短，PDF 可能拉长\/留白$/, (_m, n) => `Page ${n} · Too short; PDF may stretch or add whitespace`],
    [/^第\s*(\d+)\s*页 · 接近纸张范围$/, (_m, n) => `Page ${n} · Near paper range`],
    [/^已加载\s*(\d+)\s*段。当前只保留正在编辑分段的高清预览。$/, (_m, n) => `${n} ${n === "1" ? "section" : "sections"} loaded. Only the active section keeps a high-resolution preview.`],
    [/^已刷新截图列表，共\s*(\d+)\s*项。$/, (_m, n) => `Capture list refreshed · ${n} items.`],
    [/^已选择\s*(\d+)\s*段；可排除重复或坏段，也可加入独立截图与 PPT 分页截图。$/, (_m, n) => `${n} sections selected. Exclude duplicates or bad sections, or add standalone and PPT captures.`],
    [/^清理另外\s*(\d+)\s*条历史截图缓存？当前正在编辑的组合不会被删除。$/, (_m, n) => `Clear ${n} other historical capture caches? The set being edited will be kept.`],
    [/^已将当前分段移动到第\s*(\d+)\s*位；合并导出会按左侧顺序处理。$/, (_m, n) => `Moved the current section to position ${n}. Combined export follows the order on the left.`],
    [/^已清理\s*(\d+)\s*条历史缓存，另有\s*(\d+)\s*条未能删除。$/, (_m, removed, failed) => `Cleared ${removed} historical caches; ${failed} could not be deleted.`],
    [/^已清理\s*(\d+)\s*条其他历史缓存；当前组合仍然保留。$/, (_m, n) => `Cleared ${n} other historical caches. The current set was kept.`],
    [/^已自动整理\s*(\d+)\s*段连续截图，可统一调整、分页和导出。$/, (_m, n) => `${n} continuous ${n === "1" ? "section" : "sections"} organized and ready to adjust, paginate, and export.`],
    [/^预览已适配到\s*(\d+)%。$/, (_m, n) => `Preview fitted to ${n}%.`],
    [/^预览已缩放到\s*(\d+)%。$/, (_m, n) => `Preview zoomed to ${n}%.`],
    [/^自动分页：约\s*(\d+)\s*页。$/, (_m, n) => `Automatic pagination: about ${n} pages.`],
    [/^PPT 按截图页边界自动分页：\s*(\d+)\s*页。$/, (_m, n) => `PPT pagination follows slide boundaries: ${n} pages.`],
    [/^PPT 按截图页分页：\s*(\d+)\s*页$/, (_m, n) => `PPT capture boundaries: ${n} pages`],
    [/^按截图页边界：\s*(\d+)\s*页。已选中第\s*(\d+)\s*条$/, (_m, n, selected) => `Slide boundaries: ${n} pages. Break ${selected} selected`],
    [/^按截图页边界：\s*(\d+)\s*页(.*)$/, (_m, n, tail) => `Slide boundaries: ${n} pages${tail}`],
    [/^已到达文章末尾(?:\s*·\s*共\s*(\d+)\s*段)?$/, (_m, n) => n ? `Reached the end · ${n} sections` : "Reached the end"],
    [/^整页已完成约\s*(\d+)%\s*·\s*还剩约\s*([\d.]+)k px$/, (_m, p, r) => `About ${p}% complete · roughly ${r}k px remaining`],
    [/^已恢复上次编辑草稿：(.+)。$/, (_m, size) => `Restored the previous edit draft: ${size}.`],
    [/^拼接完成：(.+)。$/, (_m, size) => `Composition complete: ${size}.`],
    [/^正在拼接截图切片\s*(\d+)\/(\d+)\.\.\.(.*)$/, (_m, a, b, rest) => `Composing capture slices ${a}/${b}...${rest}`],
    [/^正在生成分页\s*(PNG|JPEG|PDF)\s*(\d+)\/(\d+)\.\.\.$/, (_m, type, a, b) => `Generating paged ${type} ${a}/${b}...`],
    [/^正在生成分页\s*(PNG|JPEG)：第\s*(\d+)\/(\d+)\s*段，第\s*(\d+)\/(\d+)\s*页\.\.\.$/, (_m, type, s, st, p, pt) => `Generating paged ${type}: section ${s}/${st}, page ${p}/${pt}...`],
    [/^正在合并第\s*(\d+)\/(\d+)\s*段，PDF 第\s*(\d+)\/(\d+)\s*页\.\.\.$/, (_m, s, st, p, pt) => `Combining section ${s}/${st}, PDF page ${p}/${pt}...`],
    [/^正在加载“(.+)”的高清预览\.\.\.$/, (_m, title) => `Loading a high-resolution preview for “${title}”...`],
    [/^当前正在编辑“(.+)”；已访问分段保留低清对照，其余分段轻量待命。$/, (_m, title) => `Editing “${title}”. Visited sections keep lightweight references; others remain on standby.`],
    [/^本次截图缓存约\s*(.+)。导出完成后可清理，释放浏览器本地空间。$/, (_m, size) => `This capture uses about ${size} of cache. Clear it after export to free local browser storage.`],
    [/^截图失败：(.+)$/, (_m, message) => `Capture failed: ${message}`],
    [/^第\s*(\d+)\s*张截图切片缺失。$/, (_m, n) => `Capture slice ${n} is missing.`],
    [/^目标是第\s*(\d+)\s*页，当前仍在(.+)。$/, (_m, target, current) => `Target page: ${target}; the viewer is still on ${current}.`],
    [/^当前停在第\s*(\d+)\s*页，目标是第\s*(\d+)\s*页。$/, (_m, current, target) => `Current page: ${current}; target page: ${target}.`],
    [/^(.+)低清对照预览$/, (_m, title) => `${title} lightweight reference preview`],
    [/^(\d+)\s*条：(.+?)。已选中第\s*(\d+)\s*条$/, (_m, n, values, selected) => `${n} breaks: ${values}. Break ${selected} selected`],
    [/^。已选中第\s*(\d+)\s*条$/, (_m, n) => `. Break ${n} selected`],
    [/^(\d+)\s*条：(.+)$/, (_m, n, values) => `${n} breaks: ${values}`],
    [/^自定义 P(\d+)(?:\s*·\s*(.+))?$/, (_m, n, risk) => {
      const translatedRisk = EN[risk] || risk;
      return risk ? `Custom P${n} · ${translatedRisk}` : `Custom P${n}`;
    }],
    [/^当前裁切：X\s*(\d+)\s*·\s*Y\s*(\d+)\s*·\s*(\d+)\s*×\s*(\d+)$/, (_m, x, y, width, height) => `Current crop: X ${x} · Y ${y} · ${width} × ${height}`],
    [/^第\s*(\d+)\s*页低于 PDF 参考区，(?:直接)?导出 PDF 可能被放大(?:拉伸)?或出现明显留白。$/, (_m, n) => `Page ${n} is shorter than the PDF reference area and may be enlarged or leave visible whitespace.`],
    [/^第\s*(\d+)\s*页超过 PDF 参考区，(?:直接)?导出 PDF 可能被纵向压缩(?:变形)?。$/, (_m, n) => `Page ${n} exceeds the PDF reference area and may be compressed vertically.`],
    [/^另有\s*(\d+)\s*页也偏离参考区。$/, (_m, n) => `${n} more pages are also outside the reference area.`],
    [/^正在生成分页\s*(PNG|JPEG|PDF)\s*ZIP\.\.\.$/, (_m, type) => `Generating a paged ${type} ZIP...`],
    [/^分页\s*(PNG|JPEG)\s*ZIP 已交给浏览器下载。$/, (_m, type) => `The paged ${type} ZIP was sent to the browser.`],
    [/^(.+) 已清理本次截图缓存。$/, (_m, message) => `${message} This capture cache was cleared.`],
    [/^页面太长，浏览器画布单边限制约\s*(\d+)px。当前需要\s*(\d+)\s*x\s*(\d+)px，请先缩小选区后再导出。$/, (_m, limit, width, height) => `The page is too long. The browser canvas side limit is about ${limit}px, but ${width} x ${height}px is required. Reduce the crop before exporting.`],
    [/^页面太长，拼接画布约\s*(\d+)MP。先降低导出缩放或缩小裁切范围会更稳。$/, (_m, mp) => `The composed canvas would be about ${mp}MP. Reduce export scale or crop size for a more reliable export.`],
    [/^本页已完成截图\s*·\s*第\s*(\d+)\s*段$/, (_m, n) => `This page capture is complete · Section ${n}`],
    [/^本次加载类型：(.+)$/, (_m, type) => `Navigation type: ${type}`],
    [/^上次页面事件：(.+)，约\s*(\d+)\s*秒前$/, (_m, event, seconds) => `Previous page event: ${event}, about ${seconds} seconds ago`],
    [/^事件链：(.+)$/, (_m, chain) => `Event chain: ${chain}`],
    [/^画布：(.+)，RGBA 约\s*(.+)$/, (_m, canvas, memory) => `Canvas: ${canvas}, about ${memory} RGBA`],
    [/^离开前自动保存：(.+)$/, (_m, state) => `Auto-save before leaving: ${state}`],
    [/^已选择\s*(\d+)\s*段，合计约\s*([\d.]+)k px。$/, (_m, n, height) => `${n} sections selected, about ${height}k px total.`],
    [/^正在拼接截图切片\s*(\d+)\/(\d+)\.\.\.(.*)$/, (_m, current, total, detail) => `Composing capture slices ${current}/${total}...${detail}`],
    [/^超长页面已自动缩放到\s*(\d+)%\s*预览（原始约\s*(\d+)MP，当前约\s*(\d+)MP）；预览模糊属正常，导出会重新读取原始切片。$/, (_m, scale, original, current) => `The extra-long page preview was scaled to ${scale}% (${original}MP original, about ${current}MP now). A soft preview is expected; export rereads the original slices.`],
    [/^正在生成\s*(PNG|JPG|JPEG)\.\.\.$/, (_m, type) => `Generating ${type}...`],
    [/^(PNG|JPG|JPEG) 已交给浏览器下载，并已删除本次缓存。$/, (_m, type) => `${type} was sent to the browser and this capture cache was deleted.`],
    [/^(PNG|JPG|JPEG) 已交给浏览器下载。$/, (_m, type) => `${type} was sent to the browser.`],
    [/^正在合并第\s*(\d+)\/(\d+)\s*段，PDF 第\s*(\d+)\/(\d+)\s*页(.+)\.\.\.$/, (_m, section, sections, page, pages, state) => `Combining section ${section}/${sections}, PDF page ${page}/${pages}${state}...`],
    [/^已在(.+)新增分页线。$/, (_m, source) => `Added a page break at ${source}.`],
    [/^(.+)\s+(横版|竖版)：约\s*(\d+)\s*页$/, (_m, paper, orientation, pages) => `${paper} ${orientation === "横版" ? "Landscape" : "Portrait"}: about ${pages} pages`],
    [/^自动分页：约\s*(\d+)\s*页。$/, (_m, pages) => `Automatic pagination: about ${pages} pages.`],
    [/^(.+) 建议先导出分页 PNG ZIP，再用图片合并 PDF，可避开直接 PDF 的缩放变形风险。$/, (_m, summary) => `${summary} Export a paged PNG ZIP first, then combine the images into a PDF to avoid direct PDF scaling distortion.`],
    [/^(.+)\n\n仍然直接导出分页 PDF？$/, (_m, summary) => `${summary}\n\nExport the paged PDF anyway?`],
    [/^(\d+)\s*段连续截图\s*·\s*(\d+)\s*张切片\s*·\s*(.+)$/, (_m, sections, slices, date) => `${sections} continuous sections · ${slices} slices · ${date}`],
    [/^第\s*(\d+)\s*段\s*·\s*(\d+)\s*张切片\s*·\s*([\d×x\s]+px)$/, (_m, section, slices, size) => `Section ${section} · ${slices} slices · ${size}`],
    [/^第\s*(\d+)\s*段\s*·\s*(.+?)\s*·\s*(\d+)\s*张切片\s*·\s*([\d.]+k px)$/, (_m, section, date, slices, size) => `Section ${section} · ${date} · ${slices} slices · ${size}`],
    [/^(页面滚动|内层滚动容器|按页捕获)\s*·\s*(\d+)\s*(张切片|页)\s*·\s*第\s*(\d+)\s*段\s*·\s*(.+)$/, (_m, mode, count, unit, section, source) => {
      const modeText = mode === "页面滚动" ? "Page scroll" : mode === "内层滚动容器" ? "Inner scroll container" : "Page-by-page capture";
      return `${modeText} · ${count} ${unit === "页" ? "pages" : "slices"} · Section ${section} · ${source}`;
    }],
    [/^第\s*(\d+)\s*段\s*·\s*(到达本段上限|到达自定义终点|页面不再继续滚动|手动停止)\s*·\s*(.+)$/, (_m, section, reason, range) => {
      const reasonText = {
        "到达本段上限": "Section limit reached",
        "到达自定义终点": "Custom end reached",
        "页面不再继续滚动": "The page stopped scrolling",
        "手动停止": "Stopped manually"
      }[reason] || reason;
      return `Section ${section} · ${reasonText} · ${range}`;
    }]
  ];

  const listeners = new Set();
  const originalText = new WeakMap();
  const renderedText = new WeakMap();
  const originalAttributes = new WeakMap();
  const renderedAttributes = new WeakMap();
  let locale = DEFAULT_LOCALE;
  let readyPromise = null;
  let observer = null;
  let mountedDocument = null;

  function normalizeLocale(value) {
    const normalized = String(value || "").trim();
    if (SUPPORTED_LOCALES.has(normalized)) {
      return normalized;
    }
    if (/^en(?:-|$)/i.test(normalized)) {
      return "en";
    }
    return DEFAULT_LOCALE;
  }

  function translateText(value, targetLocale = locale) {
    const source = String(value ?? "");
    if (normalizeLocale(targetLocale) !== "en" || !source.trim()) {
      return source;
    }
    const leading = source.match(/^\s*/)?.[0] || "";
    const trailing = source.match(/\s*$/)?.[0] || "";
    const trimmed = source.trim();
    const exact = EN[trimmed];
    if (exact) {
      return `${leading}${exact}${trailing}`;
    }
    for (const [pattern, replacement] of EN_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        return `${leading}${replacement(...match)}${trailing}`;
      }
    }
    return source;
  }

  async function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        try {
          const stored = await globalThis.chrome?.storage?.local?.get?.([STORAGE_KEY, LEGACY_STORAGE_KEY]);
          const storedLocale = stored?.[STORAGE_KEY] ?? stored?.[LEGACY_STORAGE_KEY];
          locale = normalizeLocale(storedLocale);
          if (!stored?.[STORAGE_KEY] && stored?.[LEGACY_STORAGE_KEY]) {
            await globalThis.chrome?.storage?.local?.set?.({ [STORAGE_KEY]: locale });
          }
        } catch (_error) {
          locale = DEFAULT_LOCALE;
        }
        installStorageListener();
        return locale;
      })();
    }
    return readyPromise;
  }

  async function setLocale(nextLocale) {
    const normalized = normalizeLocale(nextLocale);
    locale = normalized;
    try {
      await globalThis.chrome?.storage?.local?.set?.({ [STORAGE_KEY]: normalized });
    } catch (_error) {
      // The current page still switches even if storage is temporarily unavailable.
    }
    refreshMountedDocument();
    notify();
    return locale;
  }

  function getLocale() {
    return locale;
  }

  function localeForIntl() {
    return locale === "en" ? "en-US" : "zh-CN";
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    for (const listener of listeners) {
      try {
        listener(locale);
      } catch (error) {
        console.warn("Locale listener failed.", error);
      }
    }
  }

  function installStorageListener() {
    const changed = globalThis.chrome?.storage?.onChanged;
    if (!changed?.addListener || installStorageListener.installed) {
      return;
    }
    installStorageListener.installed = true;
    changed.addListener((changes, areaName) => {
      if (areaName !== "local" || (!changes?.[STORAGE_KEY] && !changes?.[LEGACY_STORAGE_KEY])) {
        return;
      }
      const next = normalizeLocale((changes[STORAGE_KEY] ?? changes[LEGACY_STORAGE_KEY]).newValue);
      if (next === locale) {
        return;
      }
      locale = next;
      refreshMountedDocument();
      notify();
    });
  }

  function mountDocument(documentRef = globalThis.document) {
    if (!documentRef?.documentElement) {
      return ready();
    }
    mountedDocument = documentRef;
    return ready().then(() => {
      applyDocument(documentRef);
      installDocumentListeners(documentRef);
      installObserver(documentRef);
      return locale;
    });
  }

  function applyDocument(root = mountedDocument) {
    const documentRef = root?.nodeType === 9 ? root : root?.ownerDocument || mountedDocument;
    if (!root || !documentRef) {
      return;
    }
    documentRef.documentElement.lang = locale;
    translateSubtree(root);
    syncLocaleControls(documentRef);
  }

  function translateSubtree(root) {
    if (!root) {
      return;
    }
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) {
      return;
    }
    if (root.nodeType === 1) {
      if (root.matches?.("[data-i18n-ignore], script, style, canvas")) {
        return;
      }
      translateElementAttributes(root);
    }
    const walker = (root.ownerDocument || root).createTreeWalker?.(
      root,
      globalThis.NodeFilter?.SHOW_ELEMENT | globalThis.NodeFilter?.SHOW_TEXT || 5
    );
    if (!walker) {
      return;
    }
    let node = walker.currentNode;
    while (node) {
      if (node !== root) {
        if (node.nodeType === 1) {
          if (node.matches?.("[data-i18n-ignore], script, style, canvas")) {
            node = nextSkippingChildren(walker, node);
            continue;
          }
          translateElementAttributes(node);
        } else if (node.nodeType === 3) {
          translateTextNode(node);
        }
      }
      node = walker.nextNode();
    }
  }

  function nextSkippingChildren(walker, node) {
    let sibling = walker.nextSibling();
    if (sibling) {
      return sibling;
    }
    let parent = node.parentNode;
    while (parent && parent !== walker.root) {
      walker.currentNode = parent;
      sibling = walker.nextSibling();
      if (sibling) {
        return sibling;
      }
      parent = parent.parentNode;
    }
    return null;
  }

  function translateTextNode(node) {
    const current = node.nodeValue || "";
    if (current !== renderedText.get(node)) {
      originalText.set(node, current);
    }
    const source = originalText.get(node) ?? current;
    const next = translateText(source);
    renderedText.set(node, next);
    if (current !== next) {
      node.nodeValue = next;
    }
  }

  function translateElementAttributes(element) {
    for (const name of ["aria-label", "title", "placeholder"]) {
      if (!element.hasAttribute?.(name)) {
        continue;
      }
      let originals = originalAttributes.get(element);
      let rendered = renderedAttributes.get(element);
      if (!originals) {
        originals = new Map();
        originalAttributes.set(element, originals);
      }
      if (!rendered) {
        rendered = new Map();
        renderedAttributes.set(element, rendered);
      }
      const current = element.getAttribute(name) || "";
      if (current !== rendered.get(name)) {
        originals.set(name, current);
      }
      const source = originals.get(name) ?? current;
      const next = translateText(source);
      rendered.set(name, next);
      if (current !== next) {
        element.setAttribute(name, next);
      }
    }
  }

  function installObserver(documentRef) {
    if (observer || typeof globalThis.MutationObserver !== "function") {
      return;
    }
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target);
        } else if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target);
        } else {
          for (const node of mutation.addedNodes) {
            translateSubtree(node);
          }
        }
      }
      syncLocaleControls(documentRef);
    });
    observer.observe(documentRef.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "placeholder"]
    });
  }

  function installDocumentListeners(documentRef) {
    if (documentRef.documentElement.dataset.xfLocaleBound === "true") {
      return;
    }
    documentRef.documentElement.dataset.xfLocaleBound = "true";
    documentRef.addEventListener("change", (event) => {
      const control = event.target?.closest?.("[data-locale-select]");
      if (control) {
        setLocale(control.value);
      }
    });
  }

  function syncLocaleControls(documentRef = mountedDocument) {
    for (const control of documentRef?.querySelectorAll?.("[data-locale-select]") || []) {
      if (control.value !== locale) {
        control.value = locale;
      }
      const label = locale === "en" ? "Interface language" : "界面语言";
      if (control.getAttribute("aria-label") !== label) {
        control.setAttribute("aria-label", label);
      }
    }
  }

  function refreshMountedDocument() {
    if (mountedDocument) {
      applyDocument(mountedDocument);
    }
  }

  globalThis.XFI18n = Object.freeze({
    STORAGE_KEY,
    DEFAULT_LOCALE,
    normalizeLocale,
    ready,
    getLocale,
    localeForIntl,
    setLocale,
    translateText,
    applyDocument,
    mountDocument,
    subscribe
  });

  if (globalThis.document?.documentElement) {
    mountDocument(globalThis.document);
  }
})();
