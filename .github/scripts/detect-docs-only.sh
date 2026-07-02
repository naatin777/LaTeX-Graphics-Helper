#!/usr/bin/env bash
set -euo pipefail

safe_git_diff() {
    git diff "$@" 2>/dev/null || echo "FORCE_RUN"
}

if [[ "${GITHUB_EVENT_NAME}" == "pull_request" ]]; then
    if git fetch --no-tags --prune --depth=1 origin "${GITHUB_BASE_REF}" 2>/dev/null; then
        changed_files="$(safe_git_diff --name-only "origin/${GITHUB_BASE_REF}" HEAD)"
    else
        changed_files="FORCE_RUN"
    fi
elif [[ -n "${EVENT_BEFORE:-}" && "${EVENT_BEFORE}" != "0000000000000000000000000000000000000000" ]]; then
    changed_files="$(safe_git_diff --name-only "${EVENT_BEFORE}" "${GITHUB_SHA}")"
else
    changed_files="$(safe_git_diff --name-only "${GITHUB_SHA}^" "${GITHUB_SHA}")"
fi

if [[ -z "${changed_files}" ]]; then
    echo "docs_only=false" >>"${GITHUB_OUTPUT}"
    exit 0
fi

docs_only=true

while IFS= read -r file; do
    case "${file}" in
        docs/* | README.md | README.ja.md | CHANGELOG.md | PROJECT_STATE.md | AGENTS.md)
            ;;
        *)
            docs_only=false
            ;;
    esac
done <<<"${changed_files}"

echo "docs_only=${docs_only}" >>"${GITHUB_OUTPUT}"
