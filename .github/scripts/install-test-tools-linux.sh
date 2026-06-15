#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	poppler-utils \
	librsvg2-bin \
	texlive-extra-utils \
	xvfb

command -v pdfcrop
command -v pdftocairo
command -v rsvg-convert
