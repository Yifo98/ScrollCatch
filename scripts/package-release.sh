#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version="$(python3 - <<'PY'
import json
from pathlib import Path

manifest = json.loads(Path("manifest.json").read_text(encoding="utf-8"))
print(manifest["version"])
PY
)"

release_name="XF-FullPage-Capture-${version}"
release_dir="dist/${release_name}"
release_zip="dist/${release_name}.zip"

rm -rf dist
mkdir -p "${release_dir}"

rsync -a \
  README.md \
  PRIVACY.md \
  manifest.json \
  background.js \
  content \
  docs \
  icons \
  popup \
  result \
  "${release_dir}/"

(
  cd "${release_dir}"
  zip -qr "../${release_name}.zip" .
)

shasum -a 256 "${release_zip}"
