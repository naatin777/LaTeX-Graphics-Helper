#!/usr/bin/env bash
set -euo pipefail

# Prepares WSL for Remote-WSL CI: workspace under /tmp, optional TeX tools for vscode-test.
# Usage: wsl-prepare.sh [vscode-test|playwright]
# Prints the workspace path on stdout; everything else goes to stderr.

mode="${1:-vscode-test}"
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
workspace="/tmp/latex-graphics-helper-vscode-test-workspace"
fixtures="$repo_root/src/test/fixtures/workspace"

cd "$repo_root"

if ! command -v node >/dev/null 2>&1; then
	sudo apt-get update >&2
	curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >&2
	sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs >&2
fi

corepack enable >&2
corepack prepare pnpm@10.28.2 --activate >&2

rm -rf "$workspace"
mkdir -p "$workspace"
cp -a "$fixtures/." "$workspace/"

if [ "$mode" = "vscode-test" ]; then
	bash .github/scripts/install-test-tools-linux.sh >&2
	node .github/scripts/export-tool-paths.mjs >&2
fi

echo "$workspace"
