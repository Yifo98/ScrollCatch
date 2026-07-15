# ScrollCatch 1.2.0 — QIDU Brand Refresh

ScrollCatch 1.2.0 completes the product identity refresh while preserving the mature capture and export workflow.

## Highlights

- Introduces the final amber scroll icon family and the `ScrollCatch · 收` QIDU identity.
- Applies a restrained ivory, amber, and charcoal visual system across the popup, quick result, and edit workbench.
- Renames the local project and GitHub repository to `ScrollCatch` and updates public documentation links.
- Uses the new `scrollCatch:*` state namespace while retaining compatibility with existing language choices and editor drafts.
- Keeps English as the default interface and remembers an explicit Chinese selection.
- Preserves full-page capture, range capture, Esc stop/cancel, long-page continuation, Feishu/Lark presentation capture, free crop, custom pagination, section ordering, cache management, and PDF export.

## Validation

- 68 automated tests passed.
- A public 100,873 px long-page fixture completed across linked sections.
- A4 portrait and A3 landscape exports produced the correct PDF page dimensions.
- The packaged extension loaded successfully in a clean Chromium profile.
- The release ZIP was scanned to exclude browser profiles, cookies, credentials, logs, screenshots, and source-machine paths.

## Install

Download `ScrollCatch-1.2.0.zip`, extract it, open your Chromium browser's extensions page, enable Developer mode, choose **Load unpacked**, and select the extracted `ScrollCatch-1.2.0` folder.
