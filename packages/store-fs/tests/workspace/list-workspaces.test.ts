import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, writeRepoTree, listWorkspaces } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('listing workspaces', () => {
    it('returns them in the order it was given', async () => {
        await createWorkspace(root, { id: 'zeta', name: 'Zeta', kind: 'async' });
        await createWorkspace(root, { id: 'alfa', name: 'Alfa', kind: 'sync' });

        const listed = await listWorkspaces(root, ['alfa', 'zeta']);

        expect(listed.workspaces.map((workspace) => workspace.id)).toEqual(['alfa', 'zeta']);
        expect(listed.warnings).toEqual([]);
    });

    it('turns a broken workspace into a warning and keeps the rest', async () => {
        await createWorkspace(root, { id: 'alfa', name: 'Alfa', kind: 'sync' });
        await writeFile(join(root, 'workspaces', 'alfa', 'workspace.yaml'), 'id: [alfa\n', 'utf8');
        await createWorkspace(root, { id: 'zeta', name: 'Zeta', kind: 'async' });

        const listed = await listWorkspaces(root, ['alfa', 'zeta']);

        expect(listed.workspaces.map((workspace) => workspace.id)).toEqual(['zeta']);
        expect(listed.warnings).toHaveLength(1);
    });
});
