$ErrorActionPreference = 'Stop'

# rsvg-convert is not part of TeX Live; pdfcrop/gs come from scheme-full.
$rsvgDir = "$env:RUNNER_TEMP\rsvg"
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
Invoke-WebRequest `
	'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' `
	-OutFile "$rsvgDir\rsvg-convert.exe"
Add-Content $env:GITHUB_PATH $rsvgDir
$env:PATH = "$rsvgDir;$env:PATH"

foreach ($tool in @('pdfcrop', 'gswin64c', 'pdftocairo')) {
	$found = Get-Command $tool -ErrorAction SilentlyContinue
	if (-not $found) {
		Write-Host "$tool not on PATH yet (TeX Live may still be wiring PATH)"
	}
}

if (-not (Get-Command pdftocairo -ErrorAction SilentlyContinue)) {
	choco install poppler -y --no-progress
}

if (-not (Test-Path "$rsvgDir\rsvg-convert.exe")) { throw "missing $rsvgDir\rsvg-convert.exe" }
if (-not (Get-Command pdfcrop -ErrorAction SilentlyContinue)) { throw 'pdfcrop not found after TeX Live install' }
if (-not (Get-Command gswin64c -ErrorAction SilentlyContinue)) { throw 'gswin64c not found after TeX Live install' }
if (-not (Get-Command pdftocairo -ErrorAction SilentlyContinue)) { throw 'pdftocairo not found after poppler fallback' }
