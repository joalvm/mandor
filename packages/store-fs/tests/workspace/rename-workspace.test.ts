import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, writeRepoTree, loadRepo, renameWorkspace } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('renaming a workspace', () => {
    it('moves the name and keeps the id and the directory', async () => {
        await writeRepoTree(root, 'Mi repo');
        const created = await createWorkspace(root, {
            id: 'eventos',
            name: 'Eventos',
            kind: 'async',
        });

        const renamed = await renameWorkspace(root, created.id, 'Pagos');

        expect(renamed).toEqual({ id: created.id, kind: 'async', name: 'Pagos' });
        expect(await loadRepo(root)).toMatchObject({
            workspaces: [{ id: created.id, name: 'Pagos' }],
        });
    });

    it('writes over the file it read, keeping what the reader did not name', async () => {
        await writeRepoTree(root, 'Mi repo');
        const created = await createWorkspace(root, {
            id: 'eventos',
            name: 'Eventos',
            kind: 'async',
        });
        const path = join(root, 'workspaces', created.id, 'workspace.yaml');
        const before = await readFile(path, 'utf8');

        await renameWorkspace(root, created.id, 'Pagos');

        const after = await readFile(path, 'utf8');

        expect(after).toContain('name: Pagos');
        expect(after.split('\n').length).toBe(before.split('\n').length);
    });

    /** The schema drops keys it does not name, so only the loaded tree can carry them over. */
    it('keeps comments and unknown keys already in the file', async () => {
        await writeRepoTree(root, 'Mi repo');
        const created = await createWorkspace(root, {
            id: 'eventos',
            name: 'Eventos',
            kind: 'async',
        });
        const path = join(root, 'workspaces', created.id, 'workspace.yaml');
        const source = await readFile(path, 'utf8');

        await writeFile(path, `# mi espacio\n${source}owner: equipo-pagos\n`, 'utf8');
        await renameWorkspace(root, created.id, 'Pagos');

        const written = await readFile(path, 'utf8');

        expect(written).toContain('# mi espacio');
        expect(written).toContain('owner: equipo-pagos');
        expect(written).toContain('name: Pagos');
    });
});
