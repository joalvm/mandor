import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const workflow = parse(await readFile(join(ROOT, '.github/workflows/release.yml'), 'utf8'));
const { plan, build, smoke, draft, publish } = workflow.jobs;

function runsOf(job) {
    return job.steps.filter((step) => step.run !== undefined).map((step) => step.run);
}

function checkoutOf(job) {
    return job.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
}

describe('the release workflow', () => {
    it('starts only from its button, for one app and one channel the updater follows', () => {
        expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);

        const { app, channel, version } = workflow.on.workflow_dispatch.inputs;

        expect(app.options).toEqual(['request', 'realtime']);
        expect(channel).toMatchObject({ options: ['beta', 'stable'], default: 'beta' });
        expect(version.default).toBe('');
    });

    it('plans the release on main, from every commit and tag, before a single build is paid for', () => {
        const runs = runsOf(plan).join('\n');

        expect(runs).toContain(`"$GITHUB_REF" != 'refs/heads/main'`);
        expect(checkoutOf(plan).with).toEqual({ 'fetch-depth': 0 });
        expect(runs).toContain('node tools/publish/release-plan.mjs "$APP" "$CHANNEL" "$VERSION"');
        expect(build.needs).toBe('plan');
    });

    it('builds the commit of the plan, on every system, with the version of the plan', () => {
        expect(checkoutOf(build).with).toEqual({ ref: '${{ needs.plan.outputs.sha }}' });
        expect([...build.strategy.matrix.os].sort()).toEqual([
            'macos-latest',
            'ubuntu-latest',
            'windows-latest',
        ]);

        const dist = runsOf(build).find((run) => run.startsWith('npm run dist'));

        expect(dist).toContain('--publish never');
        expect(dist).toContain('-c.extraMetadata.version=$VERSION');
    });

    it('refuses a mac app whose ad-hoc signature does not hold', () => {
        expect(build.env.CSC_IDENTITY_AUTO_DISCOVERY).toBe('false');
        expect(runsOf(build).join('\n')).toContain('codesign --verify --deep --strict');
    });

    it('installs and opens what it built on Linux and Windows, with the tests of main', () => {
        expect(smoke.needs).toEqual(['plan', 'build']);
        expect([...smoke.strategy.matrix.os].sort()).toEqual(['ubuntu-latest', 'windows-latest']);
        expect(checkoutOf(smoke).with).toBeUndefined();
        expect(smoke.env.MANDOR_RELEASE_VERSION).toBe('${{ needs.plan.outputs.version }}');

        for (const run of runsOf(smoke).filter((line) => line.includes('playwright test'))) {
            expect(run).toMatch(/release-smoke$/u);
        }
    });

    /** Only the jobs that publish can write, and neither runs code of the build it publishes. */
    it('writes from the draft and the publish only, which build nothing', () => {
        expect(workflow.permissions).toEqual({ contents: 'read' });

        for (const job of [plan, build, smoke]) {
            expect(job.permissions).toBeUndefined();
        }

        expect(draft.permissions).toEqual({
            contents: 'write',
            'id-token': 'write',
            attestations: 'write',
        });
        expect(publish.permissions).toEqual({ contents: 'write' });

        for (const job of [draft, publish]) {
            expect(runsOf(job).join('\n')).not.toMatch(/npm (ci|install|run)/u);
        }
    });

    it('drafts the release only once the installers opened, with their checksums and attestation', () => {
        const runs = runsOf(draft).join('\n');
        const attest = draft.steps.find((step) =>
            step.uses?.startsWith('actions/attest-build-provenance@'),
        );

        expect(draft.needs).toEqual(['plan', 'smoke']);
        expect(runs).toContain(
            'sha256sum *.exe *.dmg *.zip *.AppImage *.deb *-THIRD-PARTY-NOTICES.txt > SHA256SUMS',
        );
        expect(attest.with).toEqual({ 'subject-checksums': 'release/SHA256SUMS' });
        expect(runs).toContain('--draft --target "$SHA"');
        expect(runs).toContain('--notes-file release-notes.md');
        expect(runs).toContain('release/latest*.yml release/beta*.yml release/alpha*.yml');
    });

    /**
     * MIT, BSD and Apache-2.0 ask for their notices beside each copy: the installers carry them,
     * and the release holds them too, named for it, so they can be read before a download.
     */
    it('attaches the notices of what the installers carry, under the name of the release', () => {
        const step = build.steps.find((each) => each.run?.includes('THIRD-PARTY-NOTICES.txt'));
        const upload = build.steps.find((each) =>
            each.uses?.startsWith('actions/upload-artifact@'),
        );

        expect(step.if).toBe("runner.os == 'Linux'");
        expect(step.run).toBe(
            'cp "apps/$APP/out/licenses/THIRD-PARTY-NOTICES.txt" "apps/$APP/dist/${PRODUCT// /-}-$VERSION-THIRD-PARTY-NOTICES.txt"',
        );
        expect(build.env.PRODUCT).toBe('${{ needs.plan.outputs.product }}');
        expect(upload.with.path).toContain(
            'apps/${{ needs.plan.outputs.app }}/dist/*-THIRD-PARTY-NOTICES.txt',
        );
        expect(runsOf(draft).join('\n')).toContain(
            'files+=(release/*.blockmap release/SHA256SUMS release/*-THIRD-PARTY-NOTICES.txt)',
        );
    });

    it('names the installers in full in the update files before the draft holds them', () => {
        const runs = runsOf(draft);
        const point = runs.findIndex((run) => run.includes('tools/publish/feed-files.mjs'));
        const create = runs.findIndex((run) => run.includes('gh release create "$TAG"'));

        expect(point).toBeGreaterThanOrEqual(0);
        expect(create).toBeGreaterThan(point);
    });

    it('publishes only once a person approves, and points the feed of the app at it afterwards', () => {
        const runs = runsOf(publish);
        const release = runs.findIndex((run) =>
            run.includes('gh release edit "$TAG" --draft=false'),
        );
        const feed = runs.findIndex((run) => run.includes('gh release upload "$FEED"'));

        expect(publish.environment).toBe('release');
        expect(publish.needs).toEqual(['plan', 'draft']);
        expect(release).toBeGreaterThanOrEqual(0);
        expect(feed).toBeGreaterThan(release);
        expect(runs[feed]).toContain('gh release download "$TAG"');
        expect(runs[feed]).toContain('--clobber');
        expect(runs[feed]).toContain('--prerelease --latest=false');
    });

    /** Two releases of one app write the same feed: the second waits, and neither is cut short. */
    it('runs one release of an app at a time', () => {
        expect(workflow.concurrency).toEqual({
            group: 'release-${{ inputs.app }}',
            'cancel-in-progress': false,
        });
    });
});
