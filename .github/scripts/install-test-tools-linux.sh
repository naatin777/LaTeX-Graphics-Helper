#!/usr/bin/env bash
set -euo pipefail

# e2e tools used by conversion tests on Linux.
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	ghostscript \
	poppler-utils \
	librsvg2-bin \
	xvfb

gs_path="$(command -v gs)"
pdftocairo_path="$(command -v pdftocairo)"
rsvg_convert_path="$(command -v rsvg-convert)"

mkdir -p .vscode
cat > .vscode/settings.json <<EOF
{
    "latex-graphics-helper.execPath.ghostscript": "${gs_path}",
    "latex-graphics-helper.execPath.pdftocairo": "${pdftocairo_path}",
    "latex-graphics-helper.execPath.rsvgConvert": "${rsvg_convert_path}"
}
EOF

cat .vscode/settings.json
