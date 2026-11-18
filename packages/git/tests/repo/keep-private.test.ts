import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../../src/git/run.js';
import { commitMessage } from '../../src/repo/commit-message.js';
import { fastForward } from '../../src/repo/fast-forward.js';
import { fetchRemote } from '../../src/repo/fetch-remote.js';
import { restorePrivate, setPrivateAside, untrackPrivate } from '../../src/repo/keep-private.js';
import { withFixedIdentity } from '../support/git-environment.js';
import { cloneOf, publishedRepos, urlOf } from '../support/remote.js';
import { removeRepo, type Repo } from '../support/repo.js';

const published = publishedRepos();

const COOKIES = '.mandor/cookies.json';

let repo: Repo;
let mine: string;

beforeEach(async () => {
    withFixedIdentity();
    repo = await published();
    mine = await cloneOf(repo, 'mine');
});

afterEach(async () => {
    await removeRepo(repo);
});

/** The other machine sends a private file the way only a hand outside the app could: forced in. */
async function sendPrivate(text: string): Promise<void> {
    await mkdir(join(repo.root, '.mandor'), { recursive: true });
    await writeFile(join(repo.root, COOKIES), text, 'utf8');
    await run(['add', '-f', '--', COOKIES], repo.root);
    await run(['commit', '-q', '-m', 'send cookies'], repo.root);
    await run(['push', '-q'], repo.root);
    await fetchRemote(mine, { url: urlOf(repo) });
}

function heldHere(): Promise<string | null> {
    return readFile(join(mine, COOKIES), 'utf8').catch(() => null);
}

describe('the private files of this copy, across a move from the origin', () => {
    it('puts back what this copy held where the origin wrote its own', async () => {
        await mkdir(join(mine, '.mandor'), { recursive: true });
        await writeFile(join(mine, COOKIES), 'mine\n', 'utf8');
        await sendPrivate('theirs\n');

        const aside = await setPrivateAside(mine);

        await fastForward(mine);
        expect(await heldHere()).toBe('theirs\n');
        await restorePrivate(mine, aside);

        expect(await heldHere()).toBe('mine\n');
    });

    it('takes away a private file this copy never held', async () => {
        await sendPrivate('theirs\n');

        const aside = await setPrivateAside(mine);

        await fastForward(mine);
        await restorePrivate(mine, aside);

        expect(await heldHere()).toBeNull();
    });

    it('sets nothing aside when the origin left the private files alone', async () => {
        await expect(setPrivateAside(mine)).resolves.toEqual(new Map());
    });

    it('refuses to set aside what it cannot read, before anything moves', async () => {
        await mkdir(join(mine, COOKIES), { recursive: true });
        await sendPrivate('theirs\n');

        await expect(setPrivateAside(mine)).rejects.toThrow();
    });

    it('takes the private files a move brought out of the index in one commit', async () => {
        await sendPrivate('theirs\n');
        await fastForward(mine);

        await expect(
            untrackPrivate(mine, commitMessage({ kind: 'untrack-private' })),
        ).resolves.toBe(true);
        expect(await run(['ls-files', '--', '.mandor'], mine)).toBe('');
        expect(await run(['log', '-1', '--pretty=%s'], mine)).toBe('untrack private files');
        expect(await heldHere()).toBe('theirs\n');
    });

    it('commits nothing when the index holds no private file', async () => {
        const before = await run(['rev-parse', 'HEAD'], mine);

        await expect(untrackPrivate(mine, 'untrack private files')).resolves.toBe(false);
        expect(await run(['rev-parse', 'HEAD'], mine)).toBe(before);
    });
});
