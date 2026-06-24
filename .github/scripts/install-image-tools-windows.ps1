$ErrorActionPreference = 'Stop'

# e2e tools used by conversion tests on Windows.
$popplerVersion = '24.08.0-0'
$popplerZip = "$env:RUNNER_TEMP\poppler.zip"
$popplerRoot = "$env:RUNNER_TEMP\poppler"

Invoke-WebRequest `
	"https://github.com/oschwartz10612/poppler-windows/releases/download/v$popplerVersion/Release-$popplerVersion.zip" `
	-OutFile $popplerZip
Expand-Archive $popplerZip -DestinationPath $popplerRoot -Force

$pdftocairo = Get-ChildItem -Path $popplerRoot -Recurse -Filter pdftocairo.exe | Select-Object -First 1
if (-not $pdftocairo) {
	throw "pdftocairo.exe not found under $popplerRoot"
}
$popplerBin = $pdftocairo.DirectoryName

$rsvgDir = "$env:RUNNER_TEMP\rsvg"
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
Invoke-WebRequest `
	'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' `
	-OutFile "$rsvgDir\rsvg-convert.exe"

choco install ghostscript -y --no-progress

$gs = Get-ChildItem -Path 'C:\Program Files\gs' -Recurse -Filter gswin64c.exe -ErrorAction SilentlyContinue |
	Select-Object -First 1
if (-not $gs) {
	throw 'gswin64c.exe not found after Ghostscript install'
}

foreach ($dir in @($popplerBin, $rsvgDir, $gs.DirectoryName)) {
	Add-Content $env:GITHUB_PATH $dir
}
$env:PATH = "$popplerBin;$rsvgDir;$($gs.DirectoryName);$env:PATH"

if (-not (Test-Path $pdftocairo.FullName)) { throw "missing $($pdftocairo.FullName)" }
if (-not (Test-Path "$rsvgDir\rsvg-convert.exe")) { throw "missing $rsvgDir\rsvg-convert.exe" }
if (-not (Test-Path $gs.FullName)) { throw "missing $($gs.FullName)" }

New-Item -ItemType Directory -Force -Path .vscode | Out-Null
$settings = [ordered]@{
	'latex-graphics-helper.execPath.ghostscript' = $gs.FullName
	'latex-graphics-helper.execPath.pdftocairo' = $pdftocairo.FullName
	'latex-graphics-helper.execPath.rsvgConvert' = "$rsvgDir\rsvg-convert.exe"
}
$settings | ConvertTo-Json | Set-Content .vscode/settings.json -Encoding utf8
Get-Content .vscode/settings.json
