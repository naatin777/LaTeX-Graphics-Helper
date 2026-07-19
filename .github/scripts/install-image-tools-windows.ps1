$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$popplerVersion = '24.08.0-0'
$popplerZip = Join-Path $env:RUNNER_TEMP 'poppler.zip'
$popplerRoot = Join-Path $env:RUNNER_TEMP 'poppler'

Write-Host 'Downloading Poppler...'
Invoke-WebRequest "https://github.com/oschwartz10612/poppler-windows/releases/download/v$popplerVersion/Release-$popplerVersion.zip" -OutFile $popplerZip
Expand-Archive $popplerZip -DestinationPath $popplerRoot -Force

$pdftocairo = Get-ChildItem -Path $popplerRoot -Recurse -Filter pdftocairo.exe | Select-Object -First 1
if (-not $pdftocairo) {
	throw "pdftocairo.exe not found under $popplerRoot"
}

$rsvgDir = Join-Path $env:RUNNER_TEMP 'rsvg'
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
$rsvgConvert = Join-Path $rsvgDir 'rsvg-convert.exe'

Write-Host 'Downloading rsvg-convert...'
Invoke-WebRequest 'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' -OutFile $rsvgConvert

$ghostscriptTag = 'gs10071'
$ghostscriptInstaller = Join-Path $env:RUNNER_TEMP 'ghostscript-installer.exe'
$ghostscriptRoot = Join-Path $env:RUNNER_TEMP 'ghostscript'
$ghostscriptUrl = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/$ghostscriptTag/gs10071w64.exe"

Write-Host 'Downloading Ghostscript...'
Invoke-WebRequest $ghostscriptUrl -OutFile $ghostscriptInstaller
New-Item -ItemType Directory -Force -Path $ghostscriptRoot | Out-Null

Write-Host 'Extracting Ghostscript...'
& 7z x $ghostscriptInstaller "-o$ghostscriptRoot" -y | Out-Host
if ($LASTEXITCODE -ne 0) {
	throw "7z failed to extract Ghostscript installer with exit code $LASTEXITCODE"
}

$gs = Get-ChildItem -Path $ghostscriptRoot -Recurse -Filter gswin64c.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $gs) {
	throw 'gswin64c.exe not found after Ghostscript extraction'
}

if (-not (Test-Path $pdftocairo.FullName)) { throw "missing $($pdftocairo.FullName)" }
if (-not (Test-Path $rsvgConvert)) { throw "missing $rsvgConvert" }
if (-not (Test-Path $gs.FullName)) { throw "missing $($gs.FullName)" }

$chromeCandidates = @(
	(Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'),
	(Join-Path ${env:ProgramFiles(x86)} 'Google/Chrome/Application/chrome.exe')
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
	throw 'Chrome executable was not found.'
}

$settingsDir = Join-Path 'test/fixtures/workspace' '.vscode'
New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
$settingsPath = Join-Path $settingsDir 'settings.json'
$settings = [ordered]@{
	'latex-graphics-helper.execPath.ghostscript' = $gs.FullName
	'latex-graphics-helper.execPath.pdftocairo' = $pdftocairo.FullName
	'latex-graphics-helper.execPath.rsvgConvert' = $rsvgConvert
	'latex-graphics-helper.puppeteer.executablePath' = $chrome
}
$settings | ConvertTo-Json | Set-Content $settingsPath -Encoding utf8
Get-Content $settingsPath
