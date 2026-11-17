import { describe, expect, it } from 'vitest';

import { reusedChecks } from '../../ci/reused-checks.mjs';

const MACOS = 'e2e (macos-latest)';
const WINDOWS = 'verify (windows-latest)';
const E2E_FILE = 'apps/sync/tests/e2e/support/open-section.ts';

function filesByCommit(files) {
    return (sha) => files[sha] ?? null;
}

describe('the checks a fix does not have to repeat (reusedChecks)', () => {
    /** A macOS minute is billed as ten: a fix of an e2e test repeats only what was not green. */
    it('reuses what was green when only e2e tests changed since', () => {
        const runs = [{ sha: 'before', green: [WINDOWS] }];

        expect(reusedChecks(runs, filesByCommit({ before: [E2E_FILE] }))).toEqual(
            new Set([WINDOWS]),
        );
    });

    it('repeats a check the last run did not leave green', () => {
        const runs = [{ sha: 'before', green: [] }];

        expect(reusedChecks(runs, filesByCommit({ before: [E2E_FILE] }))).toEqual(new Set());
    });

    it.each([
        'apps/sync/src/renderer/app.tsx',
        'packages/ui/src/index.ts',
        'apps/sync/tests/unit-node/main/start.test.ts',
        '.github/workflows/ci.yml',
        'package-lock.json',
    ])('repeats everything when %s changed since', (file) => {
        const runs = [{ sha: 'before', green: [WINDOWS, MACOS] }];

        expect(reusedChecks(runs, filesByCommit({ before: [E2E_FILE, file] }))).toEqual(new Set());
    });

    /** Two fixes in a row: the check skipped on the last run was proven on the one before it. */
    it('reads each check from the newest run where it was green', () => {
        const runs = [
            { sha: 'last', green: [MACOS] },
            { sha: 'first', green: [WINDOWS, MACOS] },
        ];
        const files = filesByCommit({ last: [E2E_FILE], first: [E2E_FILE] });

        expect(reusedChecks(runs, files)).toEqual(new Set([WINDOWS, MACOS]));
    });

    /** Code that entered between the proof and now is not proven by it, however far back. */
    it('repeats a check whose proof is older than a change of code', () => {
        const runs = [
            { sha: 'last', green: [MACOS] },
            { sha: 'first', green: [WINDOWS] },
        ];
        const files = filesByCommit({ last: [E2E_FILE], first: [E2E_FILE, 'packages/ui/a.ts'] });

        expect(reusedChecks(runs, files)).toEqual(new Set([MACOS]));
    });

    /** History rewritten: the commit of the proof cannot be compared, so there is no proof. */
    it('repeats everything when the proof cannot be compared', () => {
        const runs = [{ sha: 'gone', green: [WINDOWS, MACOS] }];

        expect(reusedChecks(runs, filesByCommit({}))).toEqual(new Set());
    });

    it('reuses nothing that runs on Linux, where a failure costs the least', () => {
        const runs = [
            {
                sha: 'before',
                green: ['e2e (ubuntu-latest)', 'checks (ubuntu-latest)', 'verify (ubuntu-latest)'],
            },
        ];

        expect(reusedChecks(runs, filesByCommit({ before: [E2E_FILE] }))).toEqual(new Set());
    });

    it('repeats everything with no earlier run', () => {
        expect(reusedChecks([], filesByCommit({}))).toEqual(new Set());
    });
});
