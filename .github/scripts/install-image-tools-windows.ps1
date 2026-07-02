$ErrorActionPreference = 'Stop'

function Invoke-TimedStep {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Name,
		[Parameter(Mandatory = $true)]
		[scriptblock] $ScriptBlock
	)

	Write-Host "::group::$Name"
	$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
	try {
		& $ScriptBlock
	} finally {
		$stopwatch.Stop()
		Write-Host '::endgroup::'
		Write-Host ("[timing] {0}: {1:N1}s" -f $Name, $stopwatch.Elapsed.TotalSeconds)
	}
}

# e2e tools used by conversion tests on Windows.
$popplerVersion = '24.08.0-0'
$popplerZip = Join-Path $env:RUNNER_TEMP 'poppler.zip'
$popplerRoot = Join-Path $env:RUNNER_TEMP 'poppler'

Invoke-TimedStep 'download Poppler' {
	Invoke-WebRequest "https://github.com/oschwartz10612/poppler-windows/releases/download/v$popplerVersion/Release-$popplerVersion.zip" -OutFile $popplerZip
}

Invoke-TimedStep 'extract Poppler' {
	Expand-Archive $popplerZip -DestinationPath $popplerRoot -Force
}

$pdftocairo = Get-ChildItem -Path $popplerRoot -Recurse -Filter pdftocairo.exe | Select-Object -First 1
if (-not $pdftocairo) {
	throw "pdftocairo.exe not found under $popplerRoot"
}

$rsvgDir = Join-Path $env:RUNNER_TEMP 'rsvg'
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
$rsvgConvert = Join-Path $rsvgDir 'rsvg-convert.exe'

Invoke-TimedStep 'download rsvg-convert' {
	Invoke-WebRequest 'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' -OutFile $rsvgConvert
}

$ghostscriptTag = 'gs10071'
$ghostscriptInstaller = Join-Path $env:RUNNER_TEMP 'ghostscript-installer.exe'
$ghostscriptRoot = Join-Path $env:RUNNER_TEMP 'ghostscript'
$ghostscriptUrl = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/$ghostscriptTag/gs10071w64.exe"

Invoke-TimedStep 'download Ghostscript' {
	Invoke-WebRequest $ghostscriptUrl -OutFile $ghostscriptInstaller
}
New-Item -ItemType Directory -Force -Path $ghostscriptRoot | Out-Null

Invoke-TimedStep 'extract Ghostscript' {
	& 7z x $ghostscriptInstaller "-o$ghostscriptRoot" -y | Out-Host
	if ($LASTEXITCODE -ne 0) {
		throw "7z failed to extract Ghostscript installer with exit code $LASTEXITCODE"
	}
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
Invoke-TimedStep 'write VS Code settings' {
	$settings = [ordered]@{
		'latex-graphics-helper.execPath.ghostscript' = $gs.FullName
		'latex-graphics-helper.execPath.pdftocairo' = $pdftocairo.FullName
		'latex-graphics-helper.execPath.rsvgConvert' = $rsvgConvert
		'latex-graphics-helper.convertToPdf.svg.puppeteer.executablePath' = $chrome
		'latex-graphics-helper.convertToPdf.mermaid.puppeteer.executablePath' = $chrome
		'latex-graphics-helper.convertToSvg.mermaid.puppeteer.executablePath' = $chrome
	}
	$settings | ConvertTo-Json | Set-Content $settingsPath -Encoding utf8
}
Get-Content $settingsPath
