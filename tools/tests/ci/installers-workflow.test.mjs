import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const workflow = parse(await readFile(join(ROOT, '.github/workflows/installers.yml'), 'utf8'));
const job = workflow.jobs.installers;
const steps = job.steps;
const runs = steps.filter((step) => step.run !== undefined).map((step) => step.run);

describe('the installers workflow', () => {
    it('builds on pull requests to main and publishes nothing', () => {
        expect(workflow.on.pull_request.branches).toEqual(['main']);

        for (const trigger of ['push', 'release', 'workflow_dispatch']) {
            expect(workflow.on).not.toHaveProperty(trigger);
        }

        expect(workflow.permissions).toEqual({ contents: 'read' });

        for (const step of steps) {
            expect(step.uses ?? '').not.toMatch(/^actions\/upload-artifact/u);
        }

        for (const run of runs) {
            expect(run).not.toContain('gh release');
        }

        expect(runs.find((run) => run.startsWith('npm run dist'))).toMatch(/-- --publish never$/u);
    });

    /** Six builds, one of them at ten times the price: only a change of packaging pays for them. */
    it('starts only for a change that can alter how an app is packaged', () => {
        expect(workflow.on.pull_request.paths).toEqual([
            'apps/*/electron-builder.yml',
            'tools/ci/Dockerfile',
            '.github/workflows/installers.yml',
        ]);
    });

    it('builds both apps on every supported operating system', () => {
        const { matrix } = job.strategy;

        expect([...matrix.os].sort()).toEqual(['macos-latest', 'ubuntu-latest', 'windows-latest']);
        expect(matrix.app).toEqual(['async', 'sync']);
        expect(job.strategy['fail-fast']).toBe(false);
    });

    it('never looks for a signing identity', () => {
        expect(job.env.CSC_IDENTITY_AUTO_DISCOVERY).toBe('false');
    });

    it('fails when an installer is missing', () => {
        const listed = steps
            .filter((step) => step.run?.startsWith('ls -l'))
            .map((step) => step.run)
            .join('\n');

        for (const pattern of ['*.AppImage', '*.deb', '*.exe', '*.dmg']) {
            expect(listed).toContain(pattern);
        }
    });
});
