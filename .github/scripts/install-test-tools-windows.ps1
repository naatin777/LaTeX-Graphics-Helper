$ErrorActionPreference = 'Stop'

$popplerVersion = '24.08.0-0'
$popplerZip = "$env:RUNNER_TEMP\poppler.zip"
$popplerRoot = "$env:RUNNER_TEMP\poppler"

Invoke-WebRequest `
	"https://github.com/oschwartz10612/poppler-windows/releases/download/v$popplerVersion/Release-$popplerVersion.zip" `
	-OutFile $popplerZip
Expand-Archive $popplerZip -DestinationPath $popplerRoot -Force
$popplerBin = (Get-ChildItem $popplerRoot -Directory | Select-Object -First 1).FullName + '\Library\bin'
Add-Content $env:GITHUB_PATH $popplerBin

$rsvgDir = "$env:RUNNER_TEMP\rsvg"
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
Invoke-WebRequest `
	'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' `
	-OutFile "$rsvgDir\rsvg-convert.exe"
Add-Content $env:GITHUB_PATH $rsvgDir

Get-Command pdftocairo.exe
Get-Command rsvg-convert.exe
