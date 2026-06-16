#!/usr/bin/env bash
set -euo pipefail

# Warm pdftex formats and pdfcrop+gs PATH before vscode-test extension host starts.
fixture="src/test/fixtures/workspace/sample.pdf"
if [[ ! -f "$fixture" ]]; then
	exit 0
fi

out="$(mktemp "${TMPDIR:-/tmp}/lgh-pdfcrop-warmup.XXXXXX.pdf")"
pdfcrop "$fixture" "$out"
rm -f "$out"
