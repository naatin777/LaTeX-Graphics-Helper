#!/usr/bin/env bash
set -euo pipefail

# Prepares WSL for Remote-WSL CI: workspace under /tmp, optional TeX tools for vscode-test.
# Usage: wsl-prepare.sh [vscode-test|playwright]

mode="${1:-vscode-test}"
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
workspace="/tmp/latex-graphics-helper-vscode-test-workspace"
fixtures="$repo_root/src/test/fixtures/workspace"

cd "$repo_root"

if ! command -v node >/dev/null 2>&1; then
	sudo apt-get update
	curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
	sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

corepack enable
corepack prepare pnpm@10.28.2 --activate

rm -rf "$workspace"
mkdir -p "$workspace"
cp -a "$fixtures/." "$workspace/"

if [ "$mode" = "vscode-test" ]; then
	bash .github/scripts/install-test-tools-linux.sh
	node .github/scripts/export-tool-paths.mjs
fi

echo "$workspace"
