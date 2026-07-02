#!/usr/bin/env bash
set -euo pipefail

echo "Verifying image conversion tools..."

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

settings_path="test/fixtures/workspace/.vscode/settings.json"

read_setting() {
	local key="$1"
	node -e "const fs = require('node:fs'); const settings = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const value = settings[process.argv[2]]; if (!value) process.exit(1); process.stdout.write(value);" "${settings_path}" "${key}"
}

gs_path="$(read_setting "latex-graphics-helper.execPath.ghostscript")"
pdftocairo_path="$(read_setting "latex-graphics-helper.execPath.pdftocairo")"
rsvg_convert_path="$(read_setting "latex-graphics-helper.execPath.rsvgConvert")"
chrome_path="$(read_setting "latex-graphics-helper.convertToPdf.svg.puppeteer.executablePath")"

test -x "${gs_path}"
test -x "${pdftocairo_path}"
test -x "${rsvg_convert_path}"
test -x "${chrome_path}"

echo "Ghostscript: ${gs_path}"
"${gs_path}" --version

echo "pdftocairo: ${pdftocairo_path}"
"${pdftocairo_path}" -v

echo "rsvg-convert: ${rsvg_convert_path}"
"${rsvg_convert_path}" --version

echo "Chrome from settings.json: ${chrome_path}"
"${chrome_path}" --version

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

svg_path="${work_dir}/sample.svg"
pdf_path="${work_dir}/sample.pdf"
png_prefix="${work_dir}/sample"
png_path="${work_dir}/sample.png"

cat >"${svg_path}" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 32 24">
  <rect width="32" height="24" fill="#285078"/>
  <circle cx="16" cy="12" r="6" fill="#ffffff"/>
</svg>
SVG

run_timed "rsvg-convert SVG to PDF smoke test" "${rsvg_convert_path}" --format=pdf --output "${pdf_path}" "${svg_path}"
test -s "${pdf_path}"

run_timed "pdftocairo PDF to PNG smoke test" "${pdftocairo_path}" -png -singlefile "${pdf_path}" "${png_prefix}"
test -s "${png_path}"

echo "Image conversion tool smoke test passed."
