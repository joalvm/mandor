import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultRepoRoot } from '../../src/repo/default-repo-root.js';
import { ensureLocalRepo } from '../../src/repo/ensure-local-repo.js';

vi.mock('electron', () => ({
    app: { getPath: () => join('C:', 'Users', 'someone', 'Documents') },
}));

let base: string;
let container: string;

const REQUEST = { name: 'Mandor', workspaceName: 'Personal' } as const;

beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mandor-layout-'));
    container = join(base, 'Mandor');

    process.env['MANDOR_DEFAULT_REPO_ROOT'] = container;
    process.env['GIT_CONFIG_GLOBAL'] = join(base, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(base, 'no-system-config');
});

afterEach(async () => {
    delete process.env['MANDOR_DEFAULT_REPO_ROOT'];
    /** Windows holds handles a moment after git exits; retries keep the cleanup quiet there. */
    await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

function exists(path: string): Promise<boolean> {
    return stat(path).then(
        () => true,
        () => false,
    );
}

describe('one repo per app on disk', () => {
    it('lays out the repo of the app under the container and touches nothing else', async () => {
        const root = defaultRepoRoot('async');
        const local = await ensureLocalRepo({ ...REQUEST, kind: 'async', root });

        expect(root).toBe(join(container, 'async', 'local'));
        expect(local.workspace.kind).toBe('async');
        await expect(exists(join(root, 'mandor.yaml'))).resolves.toBe(true);
        await expect(exists(join(root, '.git'))).resolves.toBe(true);
        await expect(exists(join(container, 'sync'))).resolves.toBe(false);
    });

    /** The container holds repos; it is never a repo itself. Two git inits plus two commits; the Windows CI runner needs more than the default 5s. */
    it('leaves the two apps as sibling repos and the container without version control', async () => {
        await ensureLocalRepo({ ...REQUEST, kind: 'async', root: defaultRepoRoot('async') });
        await ensureLocalRepo({ ...REQUEST, kind: 'sync', root: defaultRepoRoot('sync') });

        await expect(exists(join(container, 'async', 'local', '.git'))).resolves.toBe(true);
        await expect(exists(join(container, 'sync', 'local', '.git'))).resolves.toBe(true);
        await expect(exists(join(container, '.git'))).resolves.toBe(false);
    }, 30_000);
});
