import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace } from '../../src/workspace/create-workspace.js';
import { emptyRepo } from '../../src/repo/empty-repo.js';
import { writeRepoTree } from '../../src/repo/write-repo-tree.js';
import { loadRepo } from '../../src/repo/load-repo.js';

describe('emptying a repo', () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'mandor-store-'));
        await writeRepoTree(root, 'Demo');
        await createWorkspace(root, { id: 'events', name: 'Events', kind: 'async' });
        await createWorkspace(root, { id: 'orders', name: 'Orders', kind: 'async' });
    });

    afterEach(async () => {
        await rm(root, { force: true, recursive: true });
    });

    it('leaves the repo without workspaces and without their directories', async () => {
        await emptyRepo(root);

        const loaded = await loadRepo(root);

        expect(loaded.repo?.workspaces).toEqual([]);
        expect(loaded.workspaces).toEqual([]);
        expect(loaded.warnings).toEqual([]);
    });

    it('keeps the repo itself in place', async () => {
        await emptyRepo(root);

        const loaded = await loadRepo(root);

        expect(loaded.repo?.name).toBe('Demo');
    });
});
