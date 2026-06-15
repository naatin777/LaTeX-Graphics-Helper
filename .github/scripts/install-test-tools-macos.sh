#!/usr/bin/env bash
set -euo pipefail

brew install poppler librsvg

command -v pdftocairo
command -v rsvg-convert
