import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const workflow = parse(await readFile(join(ROOT, '.github/workflows/release.yml'), 'utf8'));
const { tag, build, publish } = workflow.jobs;

function runsOf(job) {
    return job.steps.filter((step) => step.run !== undefined).map((step) => step.run);
}

describe('the release workflow', () => {
    it('starts only from the tag of a version of one app', () => {
        expect(Object.keys(workflow.on)).toEqual(['push']);
        expect(workflow.on.push).toEqual({ tags: ['realtime-v*', 'request-v*'] });
    });

    it('reads the tag before a single build is paid for', () => {
        expect(build.needs).toBe('tag');
        expect(runsOf(tag).join('\n')).toContain('node tools/publish/release-tag.mjs');
    });

    /** Only the job that publishes can write, and it never runs code of the build it publishes. */
    it('writes from one job only, the one with no build in it', () => {
        expect(workflow.permissions).toEqual({ contents: 'read' });
        expect(tag.permissions).toBeUndefined();
        expect(build.permissions).toBeUndefined();
        expect(publish.permissions).toEqual({
            contents: 'write',
            'id-token': 'write',
            attestations: 'write',
        });
        expect(runsOf(publish).join('\n')).not.toMatch(/npm (ci|install|run)/u);
    });

    it('builds the installers of every system, with the version of the tag', () => {
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

    it('publishes the checksums of the installers and an attestation of where they came from', () => {
        const runs = runsOf(publish).join('\n');
        const attest = publish.steps.find((step) =>
            step.uses?.startsWith('actions/attest-build-provenance@'),
        );

        expect(runs).toContain('sha256sum *.exe *.dmg *.zip *.AppImage *.deb > SHA256SUMS');
        expect(attest.with).toEqual({ 'subject-checksums': 'release/SHA256SUMS' });
        expect(runs).toContain('release/SHA256SUMS');
    });

    it('fills the feed of the app only once the release of its version holds the installers', () => {
        const runs = runsOf(publish);
        const point = runs.findIndex((run) => run.includes('tools/publish/feed-files.mjs'));
        const release = runs.findIndex((run) => run.includes('gh release create "$TAG"'));
        const feed = runs.findIndex((run) => run.includes('gh release upload "$FEED"'));

        expect(point).toBeGreaterThanOrEqual(0);
        expect(release).toBeGreaterThan(point);
        expect(feed).toBeGreaterThan(release);
        expect(runs[feed]).toContain('--clobber');
        expect(runs[feed]).toContain('--prerelease --latest=false');
    });

    /** Two tags of one app write the same feed: the second waits, and neither is cut short. */
    it('publishes one release of an app at a time', () => {
        expect(publish.concurrency).toEqual({
            group: 'release-${{ needs.tag.outputs.app }}',
            'cancel-in-progress': false,
        });
    });
});
