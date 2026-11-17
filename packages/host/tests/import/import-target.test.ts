import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeRepoTree, loadRepo } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { targetPlaces, workspaceOfTarget } from '../../src/import/import-target.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-target-'));
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the workspace an import writes into', () => {
    it('is the one the request names, and nothing is made', async () => {
        const id = await workspaceOfTarget(root, 'async', { workspaceId: 'pasarela' });

        expect(id).toBe('pasarela');
        expect((await loadRepo(root)).workspaces).toHaveLength(1);
    });

    it('is a new one named after the document, of the kind the app hosts', async () => {
        const id = await workspaceOfTarget(root, 'async', { newWorkspace: 'Cobros' });
        const made = (await loadRepo(root)).workspaces.find((workspace) => workspace.id === id);

        expect(made).toMatchObject({ name: 'Cobros', kind: 'async' });
    });

    it('is a new one with a number when a workspace already has the name', async () => {
        const id = await workspaceOfTarget(root, 'async', { newWorkspace: 'Pasarela' });
        const names = (await loadRepo(root)).workspaces.map((workspace) => workspace.name);

        expect(id).not.toBe('pasarela');
        expect(names).toEqual(['Pasarela', 'Pasarela (2)']);
    });
});

describe('the places the commit of an import takes', () => {
    it('are the folder of the workspace and the globals of the origin when it already existed', () => {
        expect(targetPlaces(root, { workspaceId: 'pasarela' }, 'pasarela')).toEqual([
            'workspaces/pasarela',
            'globals.yaml',
        ]);
    });

    it('add the repo file when the workspace was just made, for it keeps their order', () => {
        const places = targetPlaces(root, { newWorkspace: 'Cobros' }, 'cobros');

        expect(places).toEqual(['workspaces/cobros', 'mandor.yaml', 'globals.yaml']);
    });
});
