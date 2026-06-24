#!/usr/bin/env bash
set -euo pipefail

# e2e tools used by conversion tests on Linux.
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
	ghostscript \
	poppler-utils \
	librsvg2-bin \
	xvfb

command -v gs
command -v pdftocairo
command -v rsvg-convert
