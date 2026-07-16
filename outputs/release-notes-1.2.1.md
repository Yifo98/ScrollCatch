# ScrollCatch 1.2.1 — Canonical Brand Name

ScrollCatch 1.2.1 aligns every active product surface under the canonical brand name `ScrollCatch · 收`.

## Changes

- Updates the extension package name in both English and Chinese locales.
- Aligns the Chrome Web Store title, GitHub documentation, privacy policy, and in-product brand lockup.
- Keeps `Full Page Capture` as descriptive copy rather than part of the formal product name.
- Documents the Windows Smart App Control boundary and prevents native Windows installers or launcher wrappers from entering extension ZIPs.
- Preserves all capture, continuation, crop, pagination, cache, PPT, and export behavior.

## Validation

- Full automated test suite passed.
- Release package loaded from the same Manifest V3 extension boundary.
- ZIP inspection confirmed the canonical name and excluded Windows native artifacts, private data, browser profiles, and local paths.

## Install

Download `ScrollCatch-1.2.1.zip`, extract it, open your Chromium browser's extensions page, enable Developer mode, choose **Load unpacked**, and select the extracted `ScrollCatch-1.2.1` folder.
