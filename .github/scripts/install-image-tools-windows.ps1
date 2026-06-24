$ErrorActionPreference = 'Stop'

# e2e tools used by conversion tests on Windows.
$popplerVersion = '24.08.0-0'
$popplerZip = Join-Path $env:RUNNER_TEMP 'poppler.zip'
$popplerRoot = Join-Path $env:RUNNER_TEMP 'poppler'

Invoke-WebRequest "https://github.com/oschwartz10612/poppler-windows/releases/download/v$popplerVersion/Release-$popplerVersion.zip" -OutFile $popplerZip
Expand-Archive $popplerZip -DestinationPath $popplerRoot -Force

$pdftocairo = Get-ChildItem -Path $popplerRoot -Recurse -Filter pdftocairo.exe | Select-Object -First 1
if (-not $pdftocairo) {
	throw "pdftocairo.exe not found under $popplerRoot"
}

$rsvgDir = Join-Path $env:RUNNER_TEMP 'rsvg'
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
$rsvgConvert = Join-Path $rsvgDir 'rsvg-convert.exe'
Invoke-WebRequest 'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' -OutFile $rsvgConvert

choco install ghostscript -y --no-progress

$gs = Get-ChildItem -Path 'C:\Program Files\gs' -Recurse -Filter gswin64c.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $gs) {
	throw 'gswin64c.exe not found after Ghostscript install'
}

if (-not (Test-Path $pdftocairo.FullName)) { throw "missing $($pdftocairo.FullName)" }
if (-not (Test-Path $rsvgConvert)) { throw "missing $rsvgConvert" }
if (-not (Test-Path $gs.FullName)) { throw "missing $($gs.FullName)" }

$settingsDir = Join-Path 'test/fixtures/workspace' '.vscode'
New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
$settingsPath = Join-Path $settingsDir 'settings.json'
$settings = [ordered]@{
	'latex-graphics-helper.execPath.ghostscript' = $gs.FullName
	'latex-graphics-helper.execPath.pdftocairo' = $pdftocairo.FullName
	'latex-graphics-helper.execPath.rsvgConvert' = $rsvgConvert
}
$settings | ConvertTo-Json | Set-Content $settingsPath -Encoding utf8
Get-Content $settingsPath
