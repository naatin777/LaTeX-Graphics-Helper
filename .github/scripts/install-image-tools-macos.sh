#!/usr/bin/env bash
set -euo pipefail

# rsvg-convert is not part of TeX Live; pdfcrop/gs come from scheme-full.
brew install librsvg

command -v rsvg-convert
