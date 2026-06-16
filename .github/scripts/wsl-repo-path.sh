#!/usr/bin/env bash
set -euo pipefail

# Git Bash on Windows mangles backslashes in GITHUB_WORKSPACE before wslpath can run.
win="${GITHUB_WORKSPACE//\\//}"
drive=$(printf '%s' "${win:0:1}" | tr '[:upper:]' '[:lower:]')
printf '/mnt/%s%s\n' "$drive" "${win:2}"
