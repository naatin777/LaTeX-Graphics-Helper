#!/usr/bin/env bash
set -euo pipefail

# Debian TeX Live + tools not bundled in TeX Live.
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	texlive-latex-extra \
	poppler-utils \
	librsvg2-bin \
	xvfb

command -v pdfcrop
command -v pdftocairo
command -v rsvg-convert
