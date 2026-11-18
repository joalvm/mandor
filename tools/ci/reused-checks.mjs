/**
 * The checks a fix of a pull request does not have to repeat.
 *
 * Fixing a failed check takes a commit, and a commit starts the whole workflow. A minute of Windows
 * is billed as two and one of macOS as ten, and an e2e test changes nothing those jobs answer about
 * the code: a check of theirs that was green stays proven while only e2e tests change after it.
 * Linux always runs, so those tests still run once, and lint reads them. Code that changed since
 * the proof, or a proof that cannot be compared with the commit, repeats the check.
 */

import { execFileSync } from 'node:child_process';

/** The checks billed at a multiple, by the name each one reports under. */
const COSTLY_CHECKS = [
    'verify (windows-latest)',
    'e2e async (windows-latest)',
    'e2e sync (windows-latest)',
    'e2e async (macos-latest)',
    'e2e sync (macos-latest)',
];

const E2E_TESTS = /^apps\/[^/]+\/tests\/e2e\//u;

/** How many earlier runs of the pull request are read: a long chain of fixes runs everything. */
const RUNS_READ = 10;

/**
 * @param {readonly { sha: string; green: readonly string[] }[]} runs the earlier runs, newest first
 * @param {(sha: string) => readonly string[] | null} filesSince what changed since that commit, or
 * null when it cannot be told
 * @returns {Set<string>}
 */
export function reusedChecks(runs, filesSince) {
    const reused = COSTLY_CHECKS.filter((check) => {
        const proof = runs.find(({ green }) => green.includes(check));

        return (
            proof !== undefined &&
            filesSince(proof.sha)?.every((file) => E2E_TESTS.test(file)) === true
        );
    });

    return new Set(reused);
}

function gh(args) {
    return JSON.parse(execFileSync('gh', args, { encoding: 'utf8' }));
}

/** What each earlier run of the branch left green, read in the attempt that counts. */
function earlierRuns(branch, runId) {
    const runs = gh([
        'run',
        'list',
        '--workflow=ci.yml',
        `--branch=${branch}`,
        `--limit=${String(RUNS_READ)}`,
        '--json=databaseId,headSha',
    ]);

    return runs
        .filter(({ databaseId }) => String(databaseId) !== runId)
        .map(({ databaseId, headSha }) => {
            const { jobs } = gh(['run', 'view', String(databaseId), '--json=jobs']);
            const green = jobs.filter((job) => job.conclusion === 'success');

            return { sha: headSha, green: green.map((job) => job.name) };
        });
}

function filesBetween(sha, head) {
    try {
        return execFileSync('git', ['diff', '--name-only', sha, head], { encoding: 'utf8' })
            .split('\n')
            .filter((line) => line.length > 0);
    } catch {
        return null;
    }
}

/**
 * The checks this run leaves out. Reading the earlier runs is an optimisation of the bill: when it
 * fails, for a token that cannot read them or a service that is down, everything runs.
 *
 * @param {{ branch: string; head: string; runId: string }} commit
 * @returns {Set<string>}
 */
export function readReusedChecks({ branch, head, runId }) {
    try {
        return reusedChecks(earlierRuns(branch, runId), (sha) => filesBetween(sha, head));
    } catch (error) {
        console.log(`Earlier runs could not be read, so everything runs: ${String(error)}`);

        return new Set();
    }
}
