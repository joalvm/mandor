import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function read(path) {
    return readFile(join(ROOT, path), 'utf8');
}

const workflow = parse(await read('.github/workflows/ci.yml'));
const jobs = Object.entries(workflow.jobs).map(([id, job]) => ({ id, ...job }));

/** The checks `main` requires, by the name each one reports under. */
const REQUIRED = [
    'verify (ubuntu-latest)',
    'verify (windows-latest)',
    'e2e (ubuntu-latest)',
    'e2e (windows-latest)',
    'e2e (macos-latest)',
];

/** The jobs whose ceiling is above the common one, measured on the hosted runners. */
const LONGER_CEILINGS = {
    'verify (ubuntu-latest)': 2,
    'tests and build (ubuntu-latest)': 20,
    'e2e (ubuntu-latest)': 20,
    'e2e (windows-latest)': 2,
    'e2e async (windows-latest)': 20,
    'e2e sync (windows-latest)': 20,
    'e2e (macos-latest)': 2,
};

function job(name) {
    const found = jobs.find((each) => each.name === name);

    if (found === undefined) {
        throw new Error(`no job reports as ${name}`);
    }

    return found;
}

function commands(steps) {
    return steps.filter((step) => step.run !== undefined).map((step) => step.run);
}

describe('the workflow that gates a pull request (ci.yml)', () => {
    it('runs on a pull request to main and on nothing else', () => {
        expect(Object.keys(workflow.on)).toEqual(['pull_request']);
        expect(workflow.on.pull_request.branches).toEqual(['main']);
        expect(workflow.on.pull_request).not.toHaveProperty('types');
    });

    /**
     * A job skipped by its condition before its matrix expands reports under the name as written,
     * with the expression in it, and the check `main` waits for never arrives. Every required
     * check is a job of its own, named in plain text.
     */
    it('reports every required check from a job of its own, with no matrix', () => {
        for (const name of REQUIRED) {
            expect(jobs.filter((each) => each.name === name)).toHaveLength(1);
        }

        for (const each of jobs) {
            expect(each.name).not.toContain('${{');
            expect(each).not.toHaveProperty('strategy');
        }
    });

    /**
     * A hung job bills until the runner gives up, six hours later, at its multiple. The full verify
     * on Linux, the one job that builds and checks everything, and the e2e of both apps on Windows,
     * the slowest runner, get more; macOS, billed at ten, keeps the common ceiling.
     */
    it('puts a ceiling on every job', () => {
        for (const each of jobs) {
            const ceiling = LONGER_CEILINGS[each.name] ?? 15;

            expect(each['timeout-minutes'], each.name).toBeGreaterThan(0);
            expect(each['timeout-minutes'], each.name).toBeLessThanOrEqual(ceiling);
        }
    });

    /**
     * A minute of Windows is billed as two and one of macOS as ten, and most failures fail on
     * every system alike. Nothing billed at a multiple starts before Linux has passed.
     */
    it('starts dependent systems only once both independent Linux jobs have passed', () => {
        const linux = job('verify (ubuntu-latest)');

        expect(linux.needs).toEqual(['checks-linux', 'tests-linux']);
        expect(linux.if).toBe('always()');

        for (const name of ['checks (ubuntu-latest)', 'tests and build (ubuntu-latest)']) {
            expect(job(name)).not.toHaveProperty('needs');
            expect(job(name)).not.toHaveProperty('if');
            expect(job(name)['runs-on']).toBe('ubuntu-latest');

            for (const step of job(name).steps) {
                expect(step).not.toHaveProperty('continue-on-error');
            }
        }

        for (const name of [
            'verify (windows-latest)',
            'e2e (ubuntu-latest)',
            'e2e async (windows-latest)',
            'e2e sync (windows-latest)',
            'e2e async (macos-latest)',
            'e2e sync (macos-latest)',
        ]) {
            expect(job(name).needs, name).toEqual(linux.id);
        }
    });

    /** A skipped or cancelled prerequisite must never turn the protected aggregate green. */
    it.each(['success', 'failure', 'cancelled', 'skipped', 'unknown', ''])(
        'accepts only success from either Linux prerequisite, including %j',
        (result) => {
            const aggregate = job('verify (ubuntu-latest)');
            const step = aggregate.steps.find((each) => each.run !== undefined);
            const script = step.run.match(/^node -e "([\s\S]+)"\s*$/u)?.[1];

            expect(script).toBeTypeOf('string');
            expect(aggregate).not.toHaveProperty('continue-on-error');
            expect(step).not.toHaveProperty('continue-on-error');
            expect(step.env).toEqual({
                CHECKS_RESULT: '${{ needs.checks-linux.result }}',
                TESTS_RESULT: '${{ needs.tests-linux.result }}',
            });

            for (const changed of ['CHECKS_RESULT', 'TESTS_RESULT']) {
                const run = spawnSync(process.execPath, ['-e', script], {
                    env: {
                        ...process.env,
                        CHECKS_RESULT: 'success',
                        TESTS_RESULT: 'success',
                        [changed]: result,
                    },
                    encoding: 'utf8',
                });

                expect(run.status, run.stderr).toBe(result === 'success' ? 0 : 1);
            }
        },
    );

    it('reads what the change touches, labels included, before installing anything', () => {
        const linux = job('tests and build (ubuntu-latest)');
        const scope = linux.steps.findIndex((step) => step.id === 'scope');
        const install = linux.steps.findIndex((step) => step.run?.startsWith('npm ci'));

        expect(linux.steps[scope].run).toContain('node tools/ci/changed-scope.mjs');
        expect(scope).toBeLessThan(install);
        const names = [
            'e2e',
            'macos',
            'verify-windows',
            'e2e-windows-async',
            'e2e-windows-sync',
            'e2e-macos-async',
            'e2e-macos-sync',
        ];

        expect(linux.outputs).toEqual(
            Object.fromEntries(names.map((name) => [name, `\${{ steps.scope.outputs.${name} }}`])),
        );
        expect(job('verify (ubuntu-latest)').outputs).toEqual(
            Object.fromEntries(
                names.map((name) => [name, `\${{ needs.tests-linux.outputs.${name} }}`]),
            ),
        );
        // The diff needs the base, and a shallow checkout has none.
        expect(linux.steps[0].with['fetch-depth']).toBe(0);
    });

    /**
     * The labels in the event are the ones the pull request had when it was pushed. Read live,
     * a label added afterwards counts on the next run of the workflow, rerun included.
     */
    /**
     * The commit under test and the run itself, read from the run: the branch alone would count
     * this run among the earlier ones, and a commit named by the event is the one pushed.
     */
    it('tells the scope which run and which commit are this one', () => {
        const scope = job('tests and build (ubuntu-latest)').steps.find(
            (step) => step.id === 'scope',
        );

        expect(scope.env).toMatchObject({
            HEAD_REF: '${{ github.head_ref }}',
            HEAD_SHA: '${{ github.event.pull_request.head.sha }}',
            RUN_ID: '${{ github.run_id }}',
        });
    });

    it('reads the labels live and not from the event that started the run', () => {
        const scope = job('tests and build (ubuntu-latest)').steps.find(
            (step) => step.id === 'scope',
        );

        expect(JSON.stringify(scope)).not.toContain('github.event.pull_request.labels');
        expect(scope.run).toContain('gh pr view');
        expect(workflow.permissions).toEqual({
            // What the earlier runs of the pull request left green.
            actions: 'read',
            contents: 'read',
            'pull-requests': 'read',
        });
    });

    it('opens the windows only where the change reaches them', () => {
        const linux = job('verify (ubuntu-latest)').id;

        expect(job('e2e (ubuntu-latest)').if).toBe(`needs.${linux}.outputs.e2e == 'true'`);
        expect(job('e2e async (windows-latest)').if).toBe(
            `needs.${linux}.outputs.e2e-windows-async == 'true'`,
        );
        expect(job('e2e sync (windows-latest)').if).toBe(
            `needs.${linux}.outputs.e2e-windows-sync == 'true'`,
        );
        expect(job('e2e async (macos-latest)').if).toBe(
            `needs.${linux}.outputs.e2e-macos-async == 'true'`,
        );
        expect(job('e2e sync (macos-latest)').if).toBe(
            `needs.${linux}.outputs.e2e-macos-sync == 'true'`,
        );
        expect(job('verify (windows-latest)').if).toBe(
            `needs.${linux}.outputs.verify-windows == 'true'`,
        );
    });

    /** Static checks, the window tests and coverage answer the same on every system. */
    it('runs on Windows only what the system can change: the node tests', () => {
        const windows = job('verify (windows-latest)');

        expect(windows['runs-on']).toBe('windows-latest');
        expect(commands(windows.steps)).toEqual(['npm ci --ignore-scripts', 'npm run test:node']);
    });

    /** Verification never starts an app, so it never downloads the Electron that installs one. */
    it('verifies on Linux without the install scripts and keeps the build for the windows', () => {
        const linux = job('tests and build (ubuntu-latest)');
        const upload = linux.steps.find((step) => step.uses?.startsWith('actions/upload-artifact'));

        expect(commands(linux.steps).slice(1)).toEqual([
            'npm ci --ignore-scripts',
            'npm run verify:tests-build',
        ]);
        expect(commands(job('checks (ubuntu-latest)').steps)).toEqual([
            'npm ci --ignore-scripts',
            'npm run verify:checks',
        ]);
        expect(upload.if).toBe("steps.scope.outputs.e2e == 'true'");
        expect(upload.with.name).toBe('build');
        expect(upload.with.path).toBe('apps/*/out');
    });

    /** Linux opens both apps in a row; the other systems give each app a runner of its own. */
    it('drives each window with the same steps, on the build Linux made', () => {
        const linux = job('e2e (ubuntu-latest)');

        expect(linux['runs-on']).toBe('ubuntu-latest');
        expect(linux.steps.map((step) => step.uses ?? step.run)).toEqual([
            'actions/checkout@v7',
            './.github/actions/e2e',
        ]);
        expect(linux.steps.at(-1)).not.toHaveProperty('with');
    });
});
