#!/usr/bin/env sh
set -eu

root_dir=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
log_dir="$root_dir/.latex-graphics-helper/logs"
log_file="$log_dir/stop-hook-check-fix.log"

mkdir -p "$log_dir"

if (cd "$root_dir" && pnpm run check:fix >"$log_file" 2>&1); then
  printf '{}\n'
else
  printf 'Stop hook check:fix failed. See %s\n' "$log_file" >&2
  printf '{}\n'
  exit 1
fi
