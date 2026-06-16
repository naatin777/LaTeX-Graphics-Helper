#!/usr/bin/env bash
set -euo pipefail

# pdftocairo / rsvg-convert are not part of TeX Live. ghostscript is pdfcrop's backend on macOS.
brew install poppler librsvg ghostscript

command -v pdftocairo
command -v rsvg-convert
command -v gs
