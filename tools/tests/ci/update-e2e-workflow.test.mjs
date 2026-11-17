import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const workflow = parse(await readFile(join(ROOT, '.github/workflows/update-e2e.yml'), 'utf8'));
const job = workflow.jobs['update-e2e'];

describe('the update e2e workflow', () => {
    /** About 42 billed minutes a run: only a change to what it exercises, or a person, starts it. */
    it('starts for a change to the updater or its test, and by hand', () => {
        expect(workflow.on.pull_request.branches).toEqual(['main']);
        expect(workflow.on.pull_request.paths).toEqual(
            expect.arrayContaining([
                'packages/host/src/update/**',
                'packages/updates/**',
                'tools/update/**',
                '.github/workflows/update-e2e.yml',
            ]),
        );
        expect(workflow.on).toHaveProperty('workflow_dispatch');
        expect(workflow.on).not.toHaveProperty('push');
    });

    it('installs on Linux and Windows, the two systems whose installer updates by itself', () => {
        expect([...job.strategy.matrix.os].sort()).toEqual(['ubuntu-latest', 'windows-latest']);
        expect(job['timeout-minutes']).toBe(30);
        expect(job.env.CSC_IDENTITY_AUTO_DISCOVERY).toBe('false');
        expect(workflow.permissions).toEqual({ contents: 'read' });
    });

    it('builds the pair before the specs read it, and publishes nothing', () => {
        const runs = job.steps.filter((step) => step.run !== undefined).map((step) => step.run);
        const build = runs.findIndex((run) => run.includes('build-update-pair.mjs async'));
        const specs = runs.findIndex((run) => run.includes('update-install'));

        expect(build).toBeGreaterThan(-1);
        expect(specs).toBeGreaterThan(build);

        for (const step of job.steps) {
            expect(step.uses ?? '').not.toMatch(/^actions\/upload-artifact/u);
            expect(step.run ?? '').not.toContain('gh release');
        }
    });

    it('gives the AppImage the library Ubuntu stopped shipping, and a display', () => {
        const runs = job.steps.map((step) => step.run ?? '').join('\n');

        expect(runs).toContain('libfuse2t64');
        expect(runs).toContain('xvfb-run -a');
    });
});
