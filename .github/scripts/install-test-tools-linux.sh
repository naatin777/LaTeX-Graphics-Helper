#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	texlive-full \
	librsvg2-bin \
	xvfb

if ! command -v pdftocairo >/dev/null 2>&1; then
	sudo DEBIAN_FRONTEND=noninteractive apt-get install -y poppler-utils
fi

command -v pdfcrop
command -v pdftocairo
command -v rsvg-convert
command -v gs
