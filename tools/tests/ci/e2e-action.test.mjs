import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const action = parse(await readFile('.github/actions/e2e/action.yml', 'utf8'));
const steps = action.runs.steps;
const runs = steps.map((step) => step.run ?? '').join('\n');

describe('the app selected by the shared e2e action', () => {
    it('opens both apps by default and selects each app with a literal command', () => {
        expect(action.inputs.app.default).toBe('both');

        for (const app of ['async', 'sync']) {
            for (const linux of [true, false]) {
                const prefix = linux ? 'xvfb-run -a ' : '';
                const step = steps.find(
                    (each) => each.run === `${prefix}npm run e2e -w apps/${app}`,
                );
                const operator = linux ? '==' : '!=';

                expect(step?.if).toBe(
                    `runner.os ${operator} 'Linux' && (inputs.app == 'both' || inputs.app == '${app}')`,
                );
                expect(step).not.toHaveProperty('continue-on-error');
            }
        }

        expect(steps.filter((step) => step.run?.includes('npm run e2e -w'))).toHaveLength(4);
    });

    /** Invalid selection must fail before it can skip every test and leave a green action. */
    it.each(['both', 'async', 'sync', 'unknown', '', "'; process.exit(0); //"])(
        'validates the selected app without interpolating it into code: %j',
        (app) => {
            const validation = steps.find((step) => step.env?.MANDOR_E2E_APP !== undefined);
            const script = validation.run.match(/^node -e "([\s\S]+)"\s*$/u)?.[1];
            const result = spawnSync(process.execPath, ['-e', script], {
                env: { ...process.env, MANDOR_E2E_APP: app },
                encoding: 'utf8',
            });

            expect(validation.env.MANDOR_E2E_APP).toBe('${{ inputs.app }}');
            expect(validation).not.toHaveProperty('if');
            expect(validation).not.toHaveProperty('continue-on-error');
            expect(validation.run).not.toContain('${{');
            expect(result.status, result.stderr).toBe(
                ['both', 'async', 'sync'].includes(app) ? 0 : 1,
            );
            expect(steps.indexOf(validation)).toBeLessThan(
                steps.findIndex((step) => step.run?.startsWith('npm ci')),
            );
        },
    );

    it('downloads the shared build instead of making another one', () => {
        const download = steps.find((step) => step.uses?.startsWith('actions/download-artifact'));

        expect(download.with).toEqual({ name: 'build', path: 'apps' });
        expect(runs).not.toContain('test:e2e');
        expect(runs).not.toContain('npm run build');
    });

    /** Both workspaces install the same Electron; their lifecycle scripts must be serialized. */
    it('installs Electron once and prints the context of a failure', () => {
        const installs = steps.filter((step) => step.run?.startsWith('npm ci'));
        const report = steps.find((step) => step.if === 'failure()');

        expect(installs.map((step) => step.run)).toEqual(['npm ci --foreground-scripts']);
        expect(report.run).toContain('error-context.md');
    });
});
