#!/usr/bin/env bash
# Keep report destinations outside directories that Vitest/Playwright clear themselves.
set -euo pipefail

report=$(mktemp -d /artifacts/run-XXXXXXXX)
if [ -f /ci-input/metadata.json ]; then
    cp /ci-input/metadata.json "$report/metadata.json"
fi

collect() {
    result=$?
    trap - EXIT
    if [ -d coverage ]; then
        cp -R coverage "$report/" || result=1
    fi
    for app in async sync; do
        if [ -d "apps/$app/test-results" ]; then
            mkdir -p "$report/$app"
            cp -R "apps/$app/test-results" "$report/$app/" || result=1
        fi
    done
    printf '\nLocal CI reports: %s (exit %s)\n' "$report" "$result"
    exit "$result"
}

trap collect EXIT
"$@" 2>&1 | tee "$report/output.log"
