#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null 2>&1; then
	curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
	sudo apt-get install -y nodejs
fi

corepack enable
corepack prepare pnpm@10.28.2 --activate

bash .github/scripts/install-test-tools-linux.sh

export LGH_PDFCROP="$(command -v pdfcrop)"
export LGH_PDFTOCAIRO="$(command -v pdftocairo)"
export LGH_RSVG_CONVERT="$(command -v rsvg-convert)"

echo "pdfcrop=$LGH_PDFCROP"
echo "pdftocairo=$LGH_PDFTOCAIRO"
echo "rsvg-convert=$LGH_RSVG_CONVERT"

pnpm install --frozen-lockfile
xvfb-run pnpm run test
