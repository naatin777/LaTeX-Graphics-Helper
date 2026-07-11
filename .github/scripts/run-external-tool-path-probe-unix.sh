#!/usr/bin/env bash
set -euo pipefail

settings_path="test/fixtures/workspace/.vscode/settings.json"
result_root="${RUNNER_TEMP:-/tmp}/lgh-external-tool-path-probe"
drawio_path_file="${RUNNER_TEMP:-/tmp}/lgh-drawio-path.txt"

read_setting() {
	local key="$1"
	node -e "const fs = require('node:fs'); const settings = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(settings[process.argv[2]] ?? '');" "${settings_path}" "${key}"
}

optional_command() {
	command -v "$1" 2>/dev/null || true
}

drawio_path="$(optional_command drawio)"
if [[ -f "${drawio_path_file}" ]]; then
	drawio_path="$(<"${drawio_path_file}")"
fi

arguments=(
	--repository-root "${GITHUB_WORKSPACE:-$(pwd)}"
	--work-directory "${result_root}/work"
	--output-directory "${result_root}/result"
	--ghostscript "$(read_setting 'latex-graphics-helper.execPath.ghostscript')"
	--pdftocairo "$(read_setting 'latex-graphics-helper.execPath.pdftocairo')"
	--rsvg-convert "$(read_setting 'latex-graphics-helper.execPath.rsvgConvert')"
	--drawio "${drawio_path}"
	--pdfcrop "$(optional_command pdfcrop)"
	--qpdf "$(optional_command qpdf)"
)

if [[ "$(uname -s)" == "Linux" ]]; then
	arguments+=(--xvfb-run "$(optional_command xvfb-run)")
fi

node .github/scripts/probe-external-tool-paths.mjs "${arguments[@]}"
