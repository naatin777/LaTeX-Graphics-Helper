$ErrorActionPreference = 'Stop'

# pdftocairo / rsvg-convert are not part of TeX Live. Ghostscript backs pdfcrop on Windows.
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
Add-Content $env:GITHUB_PATH $popplerBin
$env:PATH = "$popplerBin;$env:PATH"

$rsvgDir = "$env:RUNNER_TEMP\rsvg"
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
Invoke-WebRequest `
	'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' `
	-OutFile "$rsvgDir\rsvg-convert.exe"
Add-Content $env:GITHUB_PATH $rsvgDir

choco install ghostscript -y --no-progress

Get-Command pdftocairo.exe
Get-Command rsvg-convert.exe
Get-Command gswin64c.exe
