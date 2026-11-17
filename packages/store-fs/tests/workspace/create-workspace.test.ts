import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    FileReadError,
    loadRepo,
    NameTakenError,
    writeRepoTree,
} from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('creating a workspace', () => {
    it('writes the workspace file under its own directory', async () => {
        await writeRepoTree(root, 'Mi repo');

        const workspace = await createWorkspace(root, {
            id: 'eventos-de-pagos',
            name: 'Eventos de pagos',
            kind: 'async',
        });
        const path = join(root, 'workspaces', workspace.id, 'workspace.yaml');

        expect(workspace).toEqual({
            id: 'eventos-de-pagos',
            kind: 'async',
            name: 'Eventos de pagos',
        });
        expect(await readFile(path, 'utf8')).toContain('kind: async');
    });

    /** Reordering must touch one file, so the order cannot come from the filesystem. */
    it('appends the workspace to the order kept in the repo file', async () => {
        await writeRepoTree(root, 'Mi repo');
        await createWorkspace(root, { id: 'zeta', name: 'Zeta', kind: 'async' });
        await createWorkspace(root, { id: 'alfa', name: 'Alfa', kind: 'sync' });

        const loaded = await loadRepo(root);

        expect(loaded.repo?.workspaces).toEqual(['zeta', 'alfa']);
    });

    it('keeps two workspaces of the same name apart by their ids', async () => {
        await writeRepoTree(root, 'Mi repo');
        await createWorkspace(root, { id: 'aaaaaaaaaaaa', name: 'Pagos', kind: 'async' });
        await createWorkspace(root, { id: 'bbbbbbbbbbbb', name: 'Pagos', kind: 'sync' });

        const loaded = await loadRepo(root);

        expect(loaded.repo?.workspaces).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb']);
    });

    it('refuses an id the repo already lists, and writes nothing', async () => {
        await writeRepoTree(root, 'Mi repo');
        await createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' });

        await expect(
            createWorkspace(root, { id: 'pagos', name: 'Otro', kind: 'sync' }),
        ).rejects.toBeInstanceOf(NameTakenError);
        expect((await loadRepo(root)).repo?.workspaces).toEqual(['pagos']);
    });

    /** Writing into a repo whose file cannot be read would drop the workspace order. */
    it('refuses to write when the repo file is unreadable', async () => {
        await expect(
            createWorkspace(root, { id: 'pagos', name: 'Pagos', kind: 'async' }),
        ).rejects.toThrow(FileReadError);
    });
});
