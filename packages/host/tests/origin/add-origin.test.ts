import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { OriginUrlError } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addOrigin } from '../../src/origin/add-origin.js';
import { listOrigins } from '../../src/origin/origins.js';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

const MINTED = /^[0-9a-hjkmnp-tv-z]{12}$/;

let userData: string;
let base: string;

beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mandor-add-origin-'));
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    process.env['MANDOR_DEFAULT_REPO_ROOT'] = join(base, 'container');
});

afterEach(async () => {
    delete process.env['MANDOR_DEFAULT_REPO_ROOT'];
    await rm(base, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

describe('adding an origin', () => {
    it('records the origin with a clean url and a root sibling of the local one', async () => {
        const stored = await addOrigin(
            { repoFolder: 'realtime', userDataDir: userData },
            { name: 'Team API', url: 'https://github.com/team/api.git' },
        );

        expect(stored).toEqual({
            id: expect.stringMatching(MINTED) as string,
            name: 'Team API',
            kind: 'remote',
            url: 'https://github.com/team/api.git',
            root: join(base, 'container', 'realtime', stored.id),
        });
        await expect(listOrigins(userData)).resolves.toEqual([stored]);
    });

    /**
     * A url with a token is stored without it; the token goes to the store of the system, under
     * a key that says what it is. A bare id would sit in the same store as the secrets of the
     * variables, where a workspace could be named after an origin.
     */
    it('lifts the embedded token out of the url and into the secrets file', async () => {
        const stored = await addOrigin(
            { repoFolder: 'realtime', userDataDir: userData },
            { name: 'Team API', url: 'https://user:tok_secret@github.com/team/api.git' },
        );

        expect(stored.url).toBe('https://github.com/team/api.git');

        const secrets = JSON.parse(
            await readFile(join(userData, 'secrets.json'), 'utf8'),
        ) as Record<string, string>;

        expect(secrets[`origin/${stored.id}`]).toBe(
            Buffer.from('enc:tok_secret', 'utf8').toString('base64'),
        );
    });

    /** The scp form is not a URL and carries no token: it is stored as it came. */
    it('accepts the scp form of an ssh url', async () => {
        const stored = await addOrigin(
            { repoFolder: 'realtime', userDataDir: userData },
            { name: 'Team API', url: 'git@gitlab.com:team/api.git' },
        );

        expect(stored.url).toBe('git@gitlab.com:team/api.git');
    });

    it('gives two origins of the same name two ids and two roots', async () => {
        const context = { repoFolder: 'realtime', userDataDir: userData } as const;
        const first = await addOrigin(context, {
            name: 'Team API',
            url: 'git@gitlab.com:team/a.git',
        });
        const second = await addOrigin(context, {
            name: 'Team API',
            url: 'git@gitlab.com:team/b.git',
        });

        expect(first.id).not.toBe(second.id);
        expect(first.root).not.toBe(second.root);
    });

    it('refuses a url that cannot name an origin', async () => {
        await expect(
            addOrigin(
                { repoFolder: 'realtime', userDataDir: userData },
                { name: 'Team', url: 'not a url' },
            ),
        ).rejects.toThrow(OriginUrlError);
        await expect(listOrigins(userData)).resolves.toEqual([]);
    });
});
