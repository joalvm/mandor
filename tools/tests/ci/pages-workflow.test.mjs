import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const workflow = parse(await readFile(join(ROOT, '.github/workflows/pages.yml'), 'utf8'));
const { build, deploy } = workflow.jobs;

describe('the pages workflow', () => {
    it('publishes from main, after a release or from its button, and never on a pull request', () => {
        expect(Object.keys(workflow.on).sort()).toEqual([
            'push',
            'workflow_dispatch',
            'workflow_run',
        ]);
        expect(workflow.on.push.branches).toEqual(['main']);
        expect(workflow.on.push.paths).toEqual([
            'site/**',
            'tools/site/**',
            '.github/workflows/pages.yml',
        ]);
        expect(workflow.on.workflow_run).toEqual({ workflows: ['release'], types: ['completed'] });
    });

    it('rebuilds after a release only when the release ended well', () => {
        expect(build.if).toContain("github.event.workflow_run.conclusion == 'success'");
    });

    it('reads the repository and writes only the pages, from the deploy job', () => {
        expect(workflow.permissions).toEqual({ contents: 'read' });
        expect(build.permissions).toBeUndefined();
        expect(deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });
        expect(deploy.environment.name).toBe('github-pages');
        expect(deploy.needs).toBe('build');
    });

    it('builds the site from main with the script the tests check, and uploads that folder', () => {
        const checkout = build.steps.find((step) => step.uses?.startsWith('actions/checkout'));
        const run = build.steps.find((step) => step.run !== undefined);
        const upload = build.steps.find((step) =>
            step.uses?.startsWith('actions/upload-pages-artifact'),
        );

        expect(checkout.with).toEqual({ ref: 'main', 'persist-credentials': false });
        expect(run.run).toBe('node tools/site/build-site.mjs --out site/out');
        expect(upload.with.path).toBe('site/out');
    });

    /** A second publication waits for the first: cancelling it could leave the site half moved. */
    it('publishes one site at a time and cuts none short', () => {
        expect(workflow.concurrency).toEqual({ group: 'pages', 'cancel-in-progress': false });
    });
});
