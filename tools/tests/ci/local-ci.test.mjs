import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = new URL('../../../', import.meta.url);

function read(path) {
    return readFile(new URL(path, ROOT), 'utf8');
}

async function hosted() {
    const workflow = parse(await read('.github/workflows/ci.yml'));
    const action = parse(await read('.github/actions/e2e/action.yml'));
    const verify = 'npm run verify';
    const e2e = action.runs.steps
        .filter((step) => step.if?.startsWith("runner.os == 'Linux' &&"))
        .map((step) => step.run.trim())
        .join(' && ');

    return { action, e2e, verify, workflow };
}

describe('local Linux CI', () => {
    it('runs the same verification and Electron commands as the hosted workflows', async () => {
        const compose = parse(await read('compose.ci.yaml'), { merge: true });
        const { e2e, verify, workflow } = await hosted();

        expect(
            workflow.jobs['checks-linux'].steps.some(
                (step) => step.run === 'npm run verify:checks',
            ),
        ).toBe(true);
        expect(
            workflow.jobs['tests-linux'].steps.some(
                (step) => step.run === 'npm run verify:tests-build',
            ),
        ).toBe(true);

        expect(compose.services.verify.command).toEqual(['sh', '-c', verify]);
        // Alone, the e2e has no build to open; after the verification, it opens the one made.
        expect(compose.services.e2e.command).toEqual(['sh', '-c', `npm run build && ${e2e}`]);
        expect(compose.services.ci.command).toEqual([
            'sh',
            '-c',
            `node tools/ci/docker-qa.mjs && ${verify} && ${e2e}`,
        ]);
        expect(compose.services.ci.cpus).toBe('${MANDOR_CI_CPUS:-2}');
        expect(compose.services.ci).not.toHaveProperty('privileged');
        // Below a private hosted runner, and without swap: an overrun fails instead of paging.
        expect(compose.services.ci.mem_limit).toBe('${MANDOR_CI_MEMORY:-6g}');
        expect(compose.services.ci.memswap_limit).toBe(compose.services.ci.mem_limit);
        expect(compose.services.ci.volumes).toEqual([
            './.local-ci:/artifacts',
            '${MANDOR_CI_INPUT:-./.local-ci/input}:/ci-input:ro',
        ]);
    });

    it('builds the Linux installers with the hosted commands', async () => {
        const compose = parse(await read('compose.ci.yaml'), { merge: true });
        const { jobs } = parse(await read('.github/workflows/installers.yml'));
        const { steps } = jobs.installers;
        const build = steps.find((step) => step.run?.startsWith('npm run dist')).run;
        const listing = steps.find((step) => step.if === "runner.os == 'Linux'").run;
        const commands = ['async', 'sync'].flatMap((app) =>
            [build, listing].map((run) => run.replaceAll('${{ matrix.app }}', app)),
        );

        expect(compose.services.installers.command).toEqual(['sh', '-c', commands.join(' && ')]);
    });

    /**
     * Both apps install the same Electron, and npm runs the install scripts of two workspaces at
     * once unless told otherwise: they write the same files and break each other. An install
     * either skips the scripts or runs them one at a time.
     */
    it('never lets the workspace installers that share Electron run at once', async () => {
        const { action, workflow } = await hosted();
        const { jobs: installerJobs } = parse(await read('.github/workflows/installers.yml'));
        const installs = [
            ...Object.values(workflow.jobs).flatMap((job) => job.steps),
            ...Object.values(installerJobs).flatMap((job) => job.steps),
            ...action.runs.steps,
        ]
            .map((step) => step.run)
            .filter((run) => run?.startsWith('npm ci'));

        expect(installs.length).toBeGreaterThan(0);

        for (const install of installs) {
            expect(['npm ci --ignore-scripts', 'npm ci --foreground-scripts']).toContain(install);
        }

        expect(await read('tools/ci/Dockerfile')).toContain('npm ci --foreground-scripts');
    });

    it('keeps host dependencies, credentials and generated outputs out of the image', async () => {
        const ignore = (await read('.dockerignore')).split(/\r?\n/);
        const dockerfile = await read('tools/ci/Dockerfile');

        expect(ignore).toEqual(
            expect.arrayContaining([
                '**/node_modules',
                '.git',
                '**/.env',
                '**/.env.*',
                '.local-ci',
            ]),
        );
        expect(dockerfile).toContain('npm ci');
        expect(dockerfile).toContain('USER ubuntu');
    });

    /** The report keeps the metadata of a run; the bundle it was fed is left behind by nobody. */
    it('removes the input of a run once the run ends', async () => {
        const runner = await read('tools/ci/docker-ci.mjs');
        const cleanup = runner.slice(runner.indexOf('} finally {'));

        expect(cleanup).toContain('rmSync(directory, { recursive: true, force: true })');
    });

    /** An edit of code reuses the install; only a manifest or the lockfile runs it again. */
    it('installs from the manifests before it copies the tree', async () => {
        const dockerfile = await read('tools/ci/Dockerfile');
        const final = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));

        expect(final).toContain('COPY --from=manifests');
        expect(final.indexOf('npm ci')).toBeGreaterThan(final.indexOf('COPY --from=manifests'));
        expect(final.indexOf('COPY --chown=ubuntu:ubuntu . .')).toBeGreaterThan(
            final.indexOf('npm ci'),
        );
    });
});
