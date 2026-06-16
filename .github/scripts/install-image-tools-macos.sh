#!/usr/bin/env bash
set -euo pipefail

# pdfcrop from install-texlive; these are not in TeX Live.
brew install poppler librsvg ghostscript

command -v pdftocairo
command -v rsvg-convert
command -v gs
