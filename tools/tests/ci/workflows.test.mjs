import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

describe('workflows', () => {
    it('reserves the checks for pull requests targeting main', async () => {
        for (const name of ['ci', 'qa', 'installers']) {
            const source = await readFile(`.github/workflows/${name}.yml`, 'utf8');
            const workflow = parse(source);

            expect(workflow.on.pull_request.branches).toEqual(['main']);
            expect(workflow.on).not.toHaveProperty('push');
        }
    });

    /** A workflow left behind by a rename runs its jobs a second time, and bills them twice. */
    it('runs a pull request through the gate, the contribution rules, the installers and the update test and nothing else', async () => {
        const names = await readdir('.github/workflows');
        const sources = await Promise.all(
            names.map((name) => readFile(`.github/workflows/${name}`, 'utf8')),
        );
        const onPullRequest = names.filter((_, index) =>
            Object.hasOwn(parse(sources[index]).on, 'pull_request'),
        );

        expect(onPullRequest.sort()).toEqual([
            'ci.yml',
            'installers.yml',
            'qa.yml',
            'update-e2e.yml',
        ]);
    });

    /** A hung job bills until the runner gives up, six hours later. */
    it('puts a ceiling on every job of every workflow', async () => {
        for (const name of await readdir('.github/workflows')) {
            const workflow = parse(await readFile(`.github/workflows/${name}`, 'utf8'));

            for (const [id, job] of Object.entries(workflow.jobs)) {
                expect(job['timeout-minutes'], `${name} ${id}`).toBeGreaterThan(0);
            }
        }
    });
});

describe('weekly security', () => {
    it('audits on a schedule and never on a pull request or a push', async () => {
        const source = await readFile('.github/workflows/security.yml', 'utf8');
        const workflow = parse(source);

        expect(Object.keys(workflow.on).sort()).toEqual(['schedule', 'workflow_dispatch']);
        expect(workflow.permissions).toEqual({ contents: 'read' });
    });

    it('asks Dependabot for every ecosystem once a week and groups what it can', async () => {
        const source = await readFile('.github/dependabot.yml', 'utf8');
        const { updates } = parse(source);

        expect(updates.map((update) => update['package-ecosystem']).sort()).toEqual([
            'github-actions',
            'npm',
        ]);

        for (const update of updates) {
            expect(update.schedule.interval).toBe('weekly');
            expect(update.groups).toBeDefined();
        }
    });
});
