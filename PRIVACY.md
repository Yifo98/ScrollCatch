# ScrollCatch — Full Page Capture Privacy Policy

Last updated: 2026-07-15

This policy applies to ScrollCatch — Full Page Capture.

## Summary

ScrollCatch is a local-first browser extension for capturing, cropping, paginating, and exporting web page screenshots. It does not create accounts, does not run analytics, does not show ads, and does not upload screenshots or page content to any external server.

## Data handled by the extension

When the user starts a capture, the extension may handle:

- Visible web page content captured as screenshots.
- The current page URL and page title, used to label local captures and help users manage cached sections.
- Capture metadata such as capture time, section order, scroll position, page dimensions, crop area, export scale, paper size, page-break lines, and cache size.
- User editing preferences and temporary drafts inside the extension result pages.

The extension does not intentionally collect names, email addresses, payment information, authentication credentials, cookies, passwords, or form submissions. If such information is visible on a page that the user chooses to capture, it may appear inside the screenshot image because the user explicitly captured that page.

## How data is used

Handled data is used only to provide the extension's user-facing screenshot features:

- Capture the selected page or page section.
- Preview the screenshot locally.
- Crop and paginate the screenshot.
- Continue long captures from a previous section.
- Merge selected captured sections.
- Export PNG, JPEG, paginated image ZIP files, or PDF files.
- Restore local editing drafts and manage recent local capture cache.

## Storage and retention

Screenshot slices, capture metadata, section cache, and editing drafts are stored locally in the user's browser through Chrome extension storage and extension-page local storage.

The extension keeps recent capture cache locally so users can reopen, continue, merge, or export sections. Users can delete individual captures, delete the current capture cache, clear all capture cache from the extension UI, or remove the extension to clear extension-managed storage. Browser storage policies may also clear local extension data.

## Sharing and transfer

The extension does not send screenshot data, page content, browsing activity, URLs, titles, drafts, or exported files to the developer or to third-party servers.

Exported files are created locally and handed to the browser download flow. After export, the user controls where those files are saved and whether they are shared.

## Third parties

ScrollCatch does not include third-party analytics, advertising SDKs, tracking pixels, remote code loaders, or server-side processing services.

## Permissions

The extension requests browser permissions only to provide its screenshot features:

- `activeTab`: access the current tab after the user invokes the extension.
- `scripting`: inject capture scripts into the selected page.
- `tabs`: read the active tab and open extension result pages.
- `storage` and `unlimitedStorage`: store local screenshot slices, metadata, cache, and editing drafts.
- `webNavigation`: inspect frames so same-page or same-origin scrollable areas can be captured when possible.
- `<all_urls>` host access: allow the user to capture pages across different websites and frames.

The extension cannot run on Chrome protected pages such as `chrome://` pages or the Chrome Web Store.

## Limited Use statement

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements. The extension uses handled data only for the user-facing screenshot, pagination, merge, cache, and export features described in its Chrome Web Store listing and user interface.

## Children's privacy

The extension is a general productivity tool and is not directed to children. It does not knowingly collect personal information from children.

## Changes

This policy may be updated when the extension's data handling or features change. Updates will be published in this file.

## Contact

For privacy questions or support, use the public GitHub issue tracker:

https://github.com/Yifo98/ScrollCatch/issues

---

# ScrollCatch — Full Page Capture 隐私政策

最后更新：2026-07-15

本政策适用于 ScrollCatch — Full Page Capture。

## 概要

ScrollCatch 是一个本地优先的浏览器扩展，用于网页截图、裁切、分页、分节合并和导出。扩展不提供账号系统，不运行统计分析，不展示广告，也不会把截图或网页内容上传到外部服务器。

## 扩展会处理哪些数据

当用户主动开始截图时，扩展可能会处理：

- 用户选择捕获的可见网页内容截图。
- 当前页面 URL 和页面标题，用于标记本地截图记录和管理分节缓存。
- 截图时间、分节顺序、滚动位置、页面尺寸、裁切区域、导出缩放、纸张尺寸、分页线、缓存大小等截图元数据。
- 结果页中的编辑偏好和临时草稿。

扩展不会主动收集姓名、邮箱、付款信息、认证凭证、Cookie、密码或表单提交内容。如果这些信息本身显示在用户选择截图的页面里，它们可能作为截图画面的一部分被保存，因为这是用户主动捕获该页面的结果。

## 数据用途

扩展处理这些数据只用于提供明确的截图功能：

- 捕获用户选择的页面或页面分节。
- 在本地预览截图。
- 裁切和分页截图。
- 从上一分节结束位置继续长页面截图。
- 合并用户选择的截图分节。
- 导出 PNG、JPEG、分页图片 ZIP 或 PDF 文件。
- 恢复本地编辑草稿并管理最近的本地截图缓存。

## 存储和保留

截图切片、截图元数据、分节缓存和编辑草稿保存在用户本机浏览器的 Chrome 扩展存储和扩展页面本地存储中。

扩展会保留最近的本地截图缓存，方便用户重新打开、继续截取、合并或导出分节。用户可以在扩展界面删除单条截图、删除本次截图缓存、清空全部截图缓存，也可以移除扩展来清除扩展管理的存储。浏览器自身的存储策略也可能清理本地扩展数据。

## 分享和传输

扩展不会向开发者或第三方服务器发送截图数据、网页内容、浏览活动、URL、标题、草稿或导出文件。

导出文件在本地生成，并交给浏览器下载流程处理。导出后，文件保存位置和是否分享由用户自行控制。

## 第三方

ScrollCatch 不包含第三方统计、广告 SDK、追踪像素、远程代码加载器或服务器端处理服务。

## 权限说明

扩展只为截图功能请求必要的浏览器权限：

- `activeTab`：用户点击扩展后访问当前标签页。
- `scripting`：向用户选择的页面注入截图脚本。
- `tabs`：读取当前标签页并打开扩展结果页。
- `storage` 和 `unlimitedStorage`：保存本地截图切片、元数据、缓存和编辑草稿。
- `webNavigation`：检查页面 frame，以便在可能时捕获同页或同源的滚动区域。
- `<all_urls>` 主机权限：允许用户在不同网站和 frame 中截图。

扩展不能在 `chrome://` 页面、Chrome Web Store 等 Chrome 受保护页面运行。

## Limited Use 声明

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

扩展只会将处理到的数据用于商店详情页和扩展界面中明确说明的截图、分页、分节合并、缓存和导出功能。

## 儿童隐私

本扩展是通用效率工具，并非面向儿童。扩展不会有意收集儿童个人信息。

## 变更

如果扩展的数据处理方式或功能发生变化，本政策会同步更新，并发布在本文件中。

## 联系方式

隐私问题或支持请求可以通过公开 GitHub Issue 提交：

https://github.com/Yifo98/ScrollCatch/issues
