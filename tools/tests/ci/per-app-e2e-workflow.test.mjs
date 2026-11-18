import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const { jobs } = parse(await readFile('.github/workflows/ci.yml', 'utf8'));

/**
 * Windows keeps focus and clipboard apart per app; a hosted Mac runs both apps in a row past the
 * common ceiling. Either way each app opens on its own runner, under a protected aggregate.
 */
const SYSTEMS = [
    { system: 'windows', scope: 'e2e' },
    { system: 'macos', scope: 'macos' },
];

/** What the aggregate reads for one app: an app left out because an earlier run proved it passes. */
function outcomeOf(system, app) {
    const job = `e2e-${system}-${app}`;

    return `\${{ needs.verify-linux.outputs.${job} == 'true' && needs.${job}.result || 'success' }}`;
}

describe.each(SYSTEMS)('$system apps on independent e2e runners', ({ system, scope }) => {
    const aggregate = jobs[`e2e-${system}`];

    it('keeps each app on its own desktop after Linux passes', () => {
        for (const app of ['async', 'sync']) {
            const job = jobs[`e2e-${system}-${app}`];

            expect(job.name).toBe(`e2e ${app} (${system}-latest)`);
            expect(job.needs).toBe('verify-linux');
            expect(job.if).toBe(`needs.verify-linux.outputs.e2e-${system}-${app} == 'true'`);
            expect(job['runs-on']).toBe(`${system}-latest`);
            expect(job).not.toHaveProperty('continue-on-error');
            expect(job.steps).toEqual([
                { uses: 'actions/checkout@v7' },
                { uses: './.github/actions/e2e', with: { app } },
            ]);
        }
    });

    it('keeps the protected name on a cheap aggregate that waits for both apps', () => {
        expect(aggregate.name).toBe(`e2e (${system}-latest)`);
        expect(aggregate['runs-on']).toBe('ubuntu-latest');
        expect(aggregate['timeout-minutes']).toBeLessThanOrEqual(2);
        expect(aggregate.needs).toEqual([
            'verify-linux',
            `e2e-${system}-async`,
            `e2e-${system}-sync`,
        ]);
        expect(aggregate.if).toBe(
            `always() && needs.verify-linux.result == 'success' && needs.verify-linux.outputs.${scope} == 'true'`,
        );
    });

    it.each(['success', 'failure', 'cancelled', 'skipped', 'unknown', ''])(
        'requires success from each app, including %j',
        (result) => {
            const step = aggregate.steps.find((each) => each.run !== undefined);
            const script = step.run.match(/^node -e "([\s\S]+)"\s*$/u)?.[1];

            expect(aggregate).not.toHaveProperty('continue-on-error');
            expect(step).not.toHaveProperty('continue-on-error');
            // Any other result of a job that was asked to run counts as what it is.
            expect(step.env).toEqual({
                ASYNC_RESULT: outcomeOf(system, 'async'),
                SYNC_RESULT: outcomeOf(system, 'sync'),
            });

            for (const changed of ['ASYNC_RESULT', 'SYNC_RESULT']) {
                const run = spawnSync(process.execPath, ['-e', script], {
                    env: {
                        ...process.env,
                        ASYNC_RESULT: 'success',
                        SYNC_RESULT: 'success',
                        [changed]: result,
                    },
                    encoding: 'utf8',
                });

                expect(run.status, run.stderr).toBe(result === 'success' ? 0 : 1);
            }
        },
    );
});
