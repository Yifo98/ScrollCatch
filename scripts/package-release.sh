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

release_name="ScrollCatch-${version}"
release_dir="dist/${release_name}"
release_zip="dist/${release_name}.zip"

mkdir -p dist
rm -rf "${release_dir}"
rm -f "${release_zip}"

rsync -a \
  README.md \
  CHANGELOG.md \
  PRIVACY.md \
  CONTEXT.md \
  manifest.json \
  background.js \
  content \
  _locales \
  icons \
  popup \
  result \
  shared \
  "${release_dir}/"

# Store screenshots are published from the repository and uploaded to the
# Chrome Web Store, but are not runtime extension files.
rsync -a --exclude "assets/store/" docs "${release_dir}/"

required_paths=(
  "manifest.json"
  "CHANGELOG.md"
  "background.js"
  "shared/i18n.js"
  "_locales/zh_CN/messages.json"
  "_locales/en/messages.json"
  "result/workflow-utils.js"
  "result/workbench-utils.js"
)

for required_path in "${required_paths[@]}"; do
  if [[ ! -f "${release_dir}/${required_path}" ]]; then
    echo "Missing required release file: ${required_path}" >&2
    exit 1
  fi
done

(
  cd "${release_dir}"
  zip -qr "../${release_name}.zip" .
)

shasum -a 256 "${release_zip}"
