#!/usr/bin/env bash
set -euo pipefail

# e2e tools used by conversion tests on macOS.
brew install poppler librsvg ghostscript

gs_path="$(command -v gs)"
pdftocairo_path="$(command -v pdftocairo)"
rsvg_convert_path="$(command -v rsvg-convert)"
chrome_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -x "${chrome_path}" ]]; then
	echo "Google Chrome executable was not found: ${chrome_path}" >&2
	exit 1
fi

settings_dir="test/fixtures/workspace/.vscode"
mkdir -p "$settings_dir"
cat > "$settings_dir/settings.json" <<EOF
{
    "latex-graphics-helper.execPath.ghostscript": "${gs_path}",
    "latex-graphics-helper.execPath.pdftocairo": "${pdftocairo_path}",
    "latex-graphics-helper.execPath.rsvgConvert": "${rsvg_convert_path}",
    "latex-graphics-helper.convertToPdf.svg.puppeteer.executablePath": "${chrome_path}",
    "latex-graphics-helper.mermaid.puppeteer.executablePath": "${chrome_path}"
}
EOF

cat "$settings_dir/settings.json"
