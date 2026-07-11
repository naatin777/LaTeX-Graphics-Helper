$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$version = '30.0.4'
$expectedSha256 = '5afec8764c32ecbb9b0de9ff8e3fd00d02f4c1aea5245a8978647ceb70a6241c'
$archive = Join-Path $env:RUNNER_TEMP 'lgh-drawio.zip'
$installRoot = Join-Path $env:RUNNER_TEMP 'lgh-drawio'
$pathFile = Join-Path $env:RUNNER_TEMP 'lgh-drawio-path.txt'
$url = "https://github.com/jgraph/drawio-desktop/releases/download/v${version}/draw.io-${version}-windows.zip"

Invoke-WebRequest $url -OutFile $archive
$actualSha256 = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha256 -ne $expectedSha256) {
	throw "draw.io archive SHA-256 mismatch: expected $expectedSha256, got $actualSha256"
}

Expand-Archive $archive -DestinationPath $installRoot -Force
$drawio = Get-ChildItem -Path $installRoot -Recurse -Filter 'draw.io.exe' | Select-Object -First 1
if (-not $drawio) {
	throw "draw.io.exe was not found under $installRoot"
}

Set-Content $pathFile $drawio.FullName -Encoding utf8NoBOM -NoNewline
Write-Host "draw.io path for probe: $($drawio.FullName)"
