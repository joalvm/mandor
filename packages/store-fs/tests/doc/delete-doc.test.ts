import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    deleteDoc,
    FileReadError,
    listDocs,
    writeDoc,
    writeRepoTree,
} from '../../src/index.js';

const WORKSPACE = 'eventos-de-pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await writeDoc(root, WORKSPACE, 'notas.md', '# Notas\n');
    await writeDoc(root, WORKSPACE, 'guia.md', '# Guía\n');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('deleting a doc of a workspace', () => {
    it('removes that file and leaves the others', async () => {
        await deleteDoc(root, WORKSPACE, 'notas.md');

        expect(await listDocs(root, WORKSPACE)).toEqual([{ name: 'guia.md', title: 'guia' }]);
    });

    it('refuses a name that names nothing', async () => {
        await expect(deleteDoc(root, WORKSPACE, 'nada.md')).rejects.toBeInstanceOf(FileReadError);
    });
});
