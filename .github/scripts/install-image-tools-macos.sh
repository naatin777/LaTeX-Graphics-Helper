#!/usr/bin/env bash
set -euo pipefail

run_timed() {
	local label="$1"
	shift
	local started_at
	started_at="$(date +%s)"
	echo "::group::${label}"
	set +e
	"$@"
	local exit_code="$?"
	set -e
	local ended_at
	ended_at="$(date +%s)"
	echo "::endgroup::"
	echo "[timing] ${label}: $((ended_at - started_at))s"
	return "$exit_code"
}

write_settings() {
	local gs_path="$1"
	local pdftocairo_path="$2"
	local rsvg_convert_path="$3"
	local chrome_path="$4"
	local settings_dir="test/fixtures/workspace/.vscode"
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
}

# e2e tools used by conversion tests on macOS.
run_timed "brew install Poppler / rsvg / Ghostscript" brew install poppler librsvg ghostscript

gs_path="$(command -v gs)"
pdftocairo_path="$(command -v pdftocairo)"
rsvg_convert_path="$(command -v rsvg-convert)"
chrome_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -x "${chrome_path}" ]]; then
	echo "Google Chrome executable was not found: ${chrome_path}" >&2
	exit 1
fi

run_timed "write VS Code settings" write_settings "$gs_path" "$pdftocairo_path" "$rsvg_convert_path" "$chrome_path"
