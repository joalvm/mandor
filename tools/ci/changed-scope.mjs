#!/usr/bin/env node
/**
 * Which windows a pull request has to open, read off the files it changes.
 *
 * The end-to-end runs open the packaged app on three systems, and the minutes of two of them are
 * billed at a multiple: Windows at two, macOS at ten. A change of prose opens none. A change of
 * code opens Linux and Windows. macOS opens only where the app meets the system, or when the pull
 * request carries the label `e2e:macos`. A job that does not run reports as skipped, and a skipped
 * job passes the check it is named after. On top of that, a fix leaves out what an earlier run
 * already proved (`reused-checks.mjs`).
 *
 * Usage, in a workflow: `node tools/ci/changed-scope.mjs` with `QA_BASE` (the base to diff
 * against), `QA_LABELS` (the labels of the pull request, as JSON), `HEAD_REF`, `HEAD_SHA` and
 * `RUN_ID` in the environment. It writes one `name=true|false` per check to `GITHUB_OUTPUT`.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { readReusedChecks } from './reused-checks.mjs';

const LABEL = 'e2e:macos';

/** Text for readers, which no window draws. */
const PROSE = [/^docs\//u, /^skills\//u, /\.md$/u];

/** The public site and what builds and publishes it, which no window of the apps draws either. */
const SITE = [
    /^site\//u,
    /^tools\/site\//u,
    /^tools\/tests\/site\//u,
    /^\.github\/workflows\/pages\.yml$/u,
];

/** Where the app meets the system it runs on: what can work on Linux and break on a Mac. */
const SYSTEM = [
    /^apps\/[^/]+\/src\/(?:main|preload)\//u,
    /^packages\/host\//u,
    /^packages\/shell\/src\/components\/title-bar\//u,
    /^apps\/[^/]+\/(?:electron-builder\.yml|electron\.vite\.config\.ts|package\.json|playwright\.config\.ts)$/u,
    /^apps\/[^/]+\/resources\//u,
    /^apps\/[^/]+\/tests\/e2e\//u,
    /^package-lock\.json$/u,
    /^\.github\/(?:workflows|actions)\//u,
];

/**
 * @param {readonly string[]} files the paths the pull request changes, with `/`
 * @param {readonly string[]} labels the labels the pull request carries
 * @returns {{ e2e: boolean; macos: boolean }}
 */
export function scopeOf(files, labels) {
    if (files.length === 0 || labels.includes(LABEL)) {
        return { e2e: true, macos: true };
    }

    const drawn = files.filter((file) => !SITE.some((site) => site.test(file)));

    return {
        e2e: drawn.some((file) => !PROSE.some((prose) => prose.test(file))),
        macos: drawn.some((file) => SYSTEM.some((system) => system.test(file))),
    };
}

/**
 * What this run starts: the scope of the change, less what an earlier run proved. A label is a
 * request to run, and an earlier run does not answer it.
 *
 * @param {{ e2e: boolean; macos: boolean }} scope
 * @param {ReadonlySet<string>} reused the names of the checks an earlier run proved
 * @param {readonly string[]} labels
 * @returns {Record<string, boolean>}
 */
export function checksToRun(scope, reused, labels) {
    const asked = labels.includes(LABEL);

    return {
        e2e: scope.e2e,
        macos: scope.macos,
        'verify-windows': !reused.has('verify (windows-latest)'),
        'e2e-windows-async': scope.e2e && !reused.has('e2e async (windows-latest)'),
        'e2e-windows-sync': scope.e2e && !reused.has('e2e sync (windows-latest)'),
        'e2e-macos-async': scope.macos && (asked || !reused.has('e2e async (macos-latest)')),
        'e2e-macos-sync': scope.macos && (asked || !reused.has('e2e sync (macos-latest)')),
    };
}

function changedFiles(base) {
    return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' })
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const labels = JSON.parse(process.env['QA_LABELS'] ?? '[]');
    const checks = checksToRun(
        scopeOf(changedFiles(process.env['QA_BASE'] ?? 'origin/main'), labels),
        readReusedChecks({
            branch: process.env['HEAD_REF'] ?? '',
            head: process.env['HEAD_SHA'] ?? 'HEAD',
            runId: process.env['RUN_ID'] ?? '',
        }),
        labels,
    );
    const lines = Object.entries(checks)
        .map(([name, runs]) => `${name}=${String(runs)}\n`)
        .join('');

    console.log(lines.trim());

    if (process.env['GITHUB_OUTPUT'] !== undefined) {
        appendFileSync(process.env['GITHUB_OUTPUT'], lines);
    }
}
