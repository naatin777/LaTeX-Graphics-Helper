$ErrorActionPreference = 'Stop'

# pdftocairo / rsvg-convert are not part of TeX Live.
choco install poppler -y --no-progress

$rsvgDir = "$env:RUNNER_TEMP\rsvg"
New-Item -ItemType Directory -Force -Path $rsvgDir | Out-Null
Invoke-WebRequest `
	'https://github.com/miyako/console-rsvg-convert/releases/download/1.0.windows-msvc-static/rsvg-convert.exe' `
	-OutFile "$rsvgDir\rsvg-convert.exe"
Add-Content $env:GITHUB_PATH $rsvgDir

Get-Command pdftocairo.exe
Get-Command rsvg-convert.exe
