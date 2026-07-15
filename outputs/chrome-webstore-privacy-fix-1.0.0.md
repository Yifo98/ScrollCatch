# Chrome Web Store privacy fix checklist

Product: ScrollCatch — Full Page Capture
Rejected revision date: 2026-06-10
Violation reference ID: Purple Nickel

## Root cause

The rejection email says the privacy policy link is broken or inaccessible. The extension listing text mentions local-first privacy, but Chrome Web Store requires a public privacy policy URL in the Developer Dashboard privacy field.

## Public policy URL to use

After `PRIVACY.md` is committed and pushed to the public repository, use this URL in the Chrome Web Store Developer Dashboard privacy policy field:

https://github.com/Yifo98/ScrollCatch/blob/main/PRIVACY.md

Do not use a local file path or an unpublished draft URL.

## Dashboard steps

1. Open the item in Chrome Web Store Developer Dashboard.
2. Go to `隐私权`.
3. Paste the public privacy policy URL above into the privacy policy field on the `隐私权` page. Do not put it only in `商品详情` -> homepage/support URL.
4. Confirm the privacy/data disclosures match the policy:
   - No analytics.
   - No ads.
   - No remote server upload.
   - Handles website content only for user-initiated screenshot capture.
   - Stores screenshot cache and editing drafts locally in extension storage.
5. Save draft.
6. Re-upload the rebuilt `dist/ScrollCatch-1.0.0.zip` if the dashboard requires a new package revision.
7. Submit for review.

## Suggested privacy/data disclosure wording

Single purpose:

Capture user-selected web pages, let users crop and paginate the captured result locally, merge long-page sections when needed, and export the result as images or PDF.

Permission justifications:

- `activeTab`: Access the current tab only after the user starts a capture.
- `scripting`: Inject local capture scripts into the selected page to measure, scroll, and capture it.
- `tabs`: Read the active tab, keep the source tab visible during capture, and open extension result pages.
- `storage` / `unlimitedStorage`: Store local screenshot slices, section cache, and editing drafts.
- `webNavigation`: Inspect frames so same-page or same-origin scrollable areas can be captured when possible.
- `<all_urls>`: Allow user-initiated capture on different websites and frames.

Data-use disclosure:

The extension handles website content only when the user starts a screenshot capture. Screenshot slices, source URL/title, metadata, section cache, and editing drafts are stored locally in browser extension storage. The extension does not upload this data to external servers, does not sell or transfer it, and does not use it for advertising, analytics, creditworthiness, or unrelated purposes.

## Local package expectation

The rebuilt ZIP should contain:

- `manifest.json` with `homepage_url`.
- `README.md`.
- `PRIVACY.md`.
- Extension source folders: `background.js`, `content/`, `icons/`, `popup/`, `result/`.
