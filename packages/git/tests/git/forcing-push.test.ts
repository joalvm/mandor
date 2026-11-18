import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isForcingPush } from '../../src/git/forcing-push.js';
import { GitError } from '../../src/git/git-error.js';
import { run, runNetwork } from '../../src/git/run.js';

describe('telling a push that rewrites the origin from one that does not', () => {
    it.each([
        ['-f'],
        ['--force'],
        ['--force-with-lease'],
        ['--force-with-lease=main:abc123'],
        ['--force-if-includes'],
        ['--mirror'],
        ['--delete'],
        ['-d'],
        ['--prune'],
    ])('refuses %s', (flag) => {
        expect(isForcingPush(['push', flag, 'origin', 'main:main'])).toBe(true);
    });

    it.each([['--forc'], ['--for'], ['--mir'], ['--del'], ['--pru'], ['--force=1']])(
        'refuses %s, which git reads as the option it abbreviates',
        (flag) => {
            expect(isForcingPush(['push', flag, 'origin', 'main:main'])).toBe(true);
        },
    );

    it('refuses a short option hidden in a cluster', () => {
        expect(isForcingPush(['push', '-uf', 'origin', 'main:main'])).toBe(true);
    });

    it.each([['+main:main'], [':main'], ['+refs/heads/main:refs/heads/main']])(
        'refuses the refspec %s: it forces the update or deletes the ref',
        (refspec) => {
            expect(isForcingPush(['push', 'origin', refspec])).toBe(true);
        },
    );

    it('refuses it after anything git takes before the command', () => {
        expect(isForcingPush(['-C', '/repo', 'push', '--force'])).toBe(true);
    });

    it.each([
        [['push', 'origin', 'main:main']],
        [['push', '-u', 'origin', 'main:main']],
        [['push', '--set-upstream', 'origin', 'main:main']],
        [['push', '--follow-tags', 'origin', 'main:main']],
    ])('lets %j through', (args) => {
        expect(isForcingPush(args)).toBe(false);
    });

    it('does not look at a command that is not a push', () => {
        expect(isForcingPush(['commit', '-f', '-m', 'push'])).toBe(false);
        expect(isForcingPush(['fetch', '--prune', 'origin'])).toBe(false);
    });
});

describe('the one place that spawns git', () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'mandor-git-'));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    /** Neither door lets it by: the refusal comes before git is asked anything. */
    it('refuses a forcing push on a working copy', async () => {
        const failure: unknown = await run(['push', '--force', 'origin', 'main'], root).catch(
            (error: unknown) => error,
        );

        expect(failure).toBeInstanceOf(GitError);
        expect((failure as GitError).detail).toContain('rewrite the origin');
    });

    it('refuses a forcing push on the network door', async () => {
        const failure: unknown = await runNetwork(['push', 'origin', '+main:main'], root, {
            url: 'https://git.example.test/a.git',
        }).catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(GitError);
        expect((failure as GitError).detail).toContain('rewrite the origin');
    });
});
