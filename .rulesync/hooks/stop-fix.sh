#!/usr/bin/env sh
set -u

print_json() {
  printf '{}\n'
}

skip_with_warning() {
  printf '%s\n' "$1" >&2
  print_json
  exit 0
}

if ! root_dir=$(git rev-parse --show-toplevel 2>/dev/null); then
  skip_with_warning 'Stop hook check:fix skipped: Git root could not be resolved.'
fi

if ! worktree_status=$(git -C "$root_dir" status --porcelain=v1 --untracked-files=all 2>/dev/null); then
  skip_with_warning 'Stop hook check:fix skipped: worktree status could not be determined.'
fi

if [ -n "$worktree_status" ]; then
  skip_with_warning 'Stop hook check:fix skipped: dirty worktree detected.'
fi

log_dir="$root_dir/.latex-graphics-helper/logs"
log_file="$log_dir/stop-hook-check-fix.log"

if ! mkdir -p "$log_dir"; then
  printf 'Stop hook could not create its log directory: %s\n' "$log_dir" >&2
  print_json
  exit 1
fi

if (cd "$root_dir" && pnpm run check:fix >"$log_file" 2>&1); then
  print_json
else
  printf 'Stop hook check:fix failed. See %s\n' "$log_file" >&2
  print_json
  exit 1
fi
