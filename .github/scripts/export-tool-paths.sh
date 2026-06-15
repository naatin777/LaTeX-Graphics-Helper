#!/usr/bin/env bash
set -euo pipefail

resolve_tool() {
	local name="$1"
	command -v "$name" 2>/dev/null || command -v "${name}.exe" 2>/dev/null || true
}

pdfcrop="$(resolve_tool pdfcrop)"
pdftocairo="$(resolve_tool pdftocairo)"
rsvg_convert="$(resolve_tool rsvg-convert)"

if [[ -z "$pdfcrop" || -z "$pdftocairo" || -z "$rsvg_convert" ]]; then
	echo "Missing tools: pdfcrop=${pdfcrop:-?} pdftocairo=${pdftocairo:-?} rsvg-convert=${rsvg_convert:-?}"
	exit 1
fi

{
	echo "LGH_PDFCROP=$pdfcrop"
	echo "LGH_PDFTOCAIRO=$pdftocairo"
	echo "LGH_RSVG_CONVERT=$rsvg_convert"
} >>"$GITHUB_ENV"

mkdir -p .vscode-test
node -e "
const fs = require('node:fs');
fs.writeFileSync(
  '.vscode-test/ci-tool-paths.json',
  JSON.stringify({
    pdfcrop: process.argv[1],
    pdftocairo: process.argv[2],
    rsvgConvert: process.argv[3],
  }),
);
" "$pdfcrop" "$pdftocairo" "$rsvg_convert"

echo "pdfcrop=$pdfcrop"
echo "pdftocairo=$pdftocairo"
echo "rsvg-convert=$rsvg_convert"
