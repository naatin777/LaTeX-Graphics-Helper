#!/usr/bin/env bash
set -euo pipefail

# pdftocairo / rsvg-convert are not part of TeX Live.
brew install poppler librsvg

command -v pdftocairo
command -v rsvg-convert
