#!/usr/bin/env bash
set -euo pipefail

# e2e tools: pdfcrop (TeX), gs (pdfcrop backend), pdftocairo/rsvg (not in TeX Live).
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	texlive-latex-extra \
	texlive-extra-utils \
	ghostscript \
	poppler-utils \
	librsvg2-bin \
	xvfb

command -v pdfcrop
command -v gs
command -v pdftocairo
command -v rsvg-convert
