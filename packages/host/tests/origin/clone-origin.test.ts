import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cloneOrigin } from '../../src/origin/clone-origin.js';
import { ensureOriginCopy } from '../../src/origin/ensure-origin-copy.js';
import type { StoredOrigin } from '../../src/origin/stored-origin.js';
import { bareOrigin, publishMandorRepo } from '../support/bare-origin.js';

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => false,
    }),
}));

let base: string;

beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mandor-clone-'));
    process.env['GIT_CONFIG_GLOBAL'] = join(base, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(base, 'no-system-config');
});

afterEach(async () => {
    await rm(base, { force: true, recursive: true });
});

function exists(path: string): Promise<boolean> {
    return stat(path).then(
        () => true,
        () => false,
    );
}

function team(url: string): StoredOrigin {
    return { id: 'team', kind: 'remote', name: 'Team', root: join(base, 'team'), url };
}

describe('bringing the work of an origin to this machine', () => {
    /** A copy from a run that died halfway is not trusted: it is thrown away and built again. */
    it('builds the copy again over a half copy a dead run left', async () => {
        const bare = await bareOrigin(base, 'remote');
        const origin = team(bare.url);

        await publishMandorRepo(base, bare, 'Team');
        await mkdir(`${origin.root}.partial`, { recursive: true });
        await writeFile(join(`${origin.root}.partial`, 'junk.txt'), 'half\n', 'utf8');

        await cloneOrigin(origin, { url: bare.url });

        expect(await exists(join(origin.root, 'mandor.yaml'))).toBe(true);
        expect(await exists(join(origin.root, 'junk.txt'))).toBe(false);
        expect(await exists(`${origin.root}.partial`)).toBe(false);
    });

    it('builds the container of the copy when the machine has none yet', async () => {
        const bare = await bareOrigin(base, 'remote');
        const origin = { ...team(bare.url), root: join(base, 'deep', 'er', 'team') };

        await publishMandorRepo(base, bare, 'Team');
        await cloneOrigin(origin, { url: bare.url });

        expect(await exists(join(origin.root, 'mandor.yaml'))).toBe(true);
    });
});

describe('making sure an origin has its copy', () => {
    it('leaves the local origin alone: it has its copy from the start', async () => {
        const local: StoredOrigin = { id: 'local', kind: 'local', name: 'Local', root: base };

        await expect(ensureOriginCopy(base, local)).resolves.toBeUndefined();
    });

    it('does not touch a copy that is already there', async () => {
        const origin = team('file:///nowhere.git');

        await mkdir(origin.root);
        await writeFile(join(origin.root, 'mine.txt'), 'kept\n', 'utf8');

        await ensureOriginCopy(base, origin);

        expect(await exists(join(origin.root, 'mine.txt'))).toBe(true);
    });
});
