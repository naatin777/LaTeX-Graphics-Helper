#!/usr/bin/env bash
set -euo pipefail

# e2e tools used by conversion tests on Linux.
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	ghostscript \
	poppler-utils \
	qpdf \
	librsvg2-bin \
	xvfb

gs_path="$(command -v gs)"
pdftocairo_path="$(command -v pdftocairo)"
rsvg_convert_path="$(command -v rsvg-convert)"
chrome_path="$(command -v google-chrome)"

settings_dir="test/fixtures/workspace/.vscode"
mkdir -p "$settings_dir"
cat > "$settings_dir/settings.json" <<EOF
{
    "latex-graphics-helper.execPath.ghostscript": "${gs_path}",
    "latex-graphics-helper.execPath.pdftocairo": "${pdftocairo_path}",
    "latex-graphics-helper.execPath.rsvgConvert": "${rsvg_convert_path}",
    "latex-graphics-helper.convertToPdf.svg.puppeteer.executablePath": "${chrome_path}",
    "latex-graphics-helper.convertToPdf.mermaid.puppeteer.executablePath": "${chrome_path}",
    "latex-graphics-helper.convertToSvg.mermaid.puppeteer.executablePath": "${chrome_path}"
}
EOF

cat "$settings_dir/settings.json"
