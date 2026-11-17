import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const { jobs } = parse(await readFile('.github/workflows/ci.yml', 'utf8'));
const aggregate = jobs['e2e-windows'];

describe('Windows apps on independent e2e runners', () => {
    it('keeps each app on its own desktop after Linux passes', () => {
        for (const app of ['async', 'sync']) {
            const job = jobs[`e2e-windows-${app}`];

            expect(job.needs).toBe('verify-linux');
            expect(job.if).toBe(`needs.verify-linux.outputs.e2e-windows-${app} == 'true'`);
            expect(job['runs-on']).toBe('windows-latest');
            expect(job).not.toHaveProperty('continue-on-error');
            expect(job.steps).toEqual([
                { uses: 'actions/checkout@v7' },
                { uses: './.github/actions/e2e', with: { app } },
            ]);
        }
    });

    it('keeps the protected name on a cheap aggregate that waits for both apps', () => {
        expect(aggregate.name).toBe('e2e (windows-latest)');
        expect(aggregate['runs-on']).toBe('ubuntu-latest');
        expect(aggregate['timeout-minutes']).toBeLessThanOrEqual(2);
        expect(aggregate.needs).toEqual(['verify-linux', 'e2e-windows-async', 'e2e-windows-sync']);
        expect(aggregate.if).toBe(
            "always() && needs.verify-linux.result == 'success' && needs.verify-linux.outputs.e2e == 'true'",
        );
    });

    it.each(['success', 'failure', 'cancelled', 'skipped', 'unknown', ''])(
        'requires success from each app, including %j',
        (result) => {
            const step = aggregate.steps.find((each) => each.run !== undefined);
            const script = step.run.match(/^node -e "([\s\S]+)"\s*$/u)?.[1];

            expect(aggregate).not.toHaveProperty('continue-on-error');
            expect(step).not.toHaveProperty('continue-on-error');
            // An app left out because an earlier run proved it counts as passed; any other result
            // of a job that was asked to run counts as what it is.
            expect(step.env).toEqual({
                ASYNC_RESULT:
                    "${{ needs.verify-linux.outputs.e2e-windows-async == 'true' && needs.e2e-windows-async.result || 'success' }}",
                SYNC_RESULT:
                    "${{ needs.verify-linux.outputs.e2e-windows-sync == 'true' && needs.e2e-windows-sync.result || 'success' }}",
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
