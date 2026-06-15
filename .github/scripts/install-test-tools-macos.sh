#!/usr/bin/env bash
set -euo pipefail

brew install poppler librsvg ghostscript

command -v pdftocairo
command -v rsvg-convert
command -v gs
