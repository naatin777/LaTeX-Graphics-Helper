$ErrorActionPreference = 'Stop'

$settingsPath = Join-Path 'test/fixtures/workspace/.vscode' 'settings.json'
$settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
$resultRoot = Join-Path $env:RUNNER_TEMP 'lgh-external-tool-path-probe'
$drawioPathFile = Join-Path $env:RUNNER_TEMP 'lgh-drawio-path.txt'
$qpdfRoot = Join-Path $env:RUNNER_TEMP 'qpdf'

$drawio = if (Test-Path $drawioPathFile) { Get-Content $drawioPathFile -Raw } else { '' }
$qpdf = Get-ChildItem -Path $qpdfRoot -Recurse -Filter qpdf.exe -ErrorAction SilentlyContinue | Select-Object -First 1
$pdfcrop = Get-Command pdfcrop -ErrorAction SilentlyContinue

$arguments = @(
	'.github/scripts/probe-external-tool-paths.mjs',
	'--repository-root', $env:GITHUB_WORKSPACE,
	'--work-directory', (Join-Path $resultRoot 'work'),
	'--output-directory', (Join-Path $resultRoot 'result'),
	'--ghostscript', $settings.'latex-graphics-helper.execPath.ghostscript',
	'--pdftocairo', $settings.'latex-graphics-helper.execPath.pdftocairo',
	'--rsvg-convert', $settings.'latex-graphics-helper.execPath.rsvgConvert',
	'--drawio', $drawio.Trim(),
	'--pdfcrop', $(if ($pdfcrop) { $pdfcrop.Source } else { '' }),
	'--qpdf', $(if ($qpdf) { $qpdf.FullName } else { '' })
)

& node @arguments
if ($LASTEXITCODE -ne 0) {
	throw "external tool path probe failed with exit code $LASTEXITCODE"
}
