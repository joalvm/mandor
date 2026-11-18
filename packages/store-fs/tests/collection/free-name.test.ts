import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertFreeName } from '../../src/collection/free-name.js';
import { NameTakenError } from '../../src/collection/name-taken-error.js';
import { createCollection, createWorkspace, writeRepoTree } from '../../src/index.js';
import { mountCollection } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-free-name-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
    await mountCollection(root, WORKSPACE, {
        'pedidos/uno.yaml': 'kind: message\nname: Uno\n',
        'pedidos/ayer/folder.yaml': 'name: Ayer\norder: []\n',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('checking that a name is free', () => {
    it('lets a path that names nothing through', async () => {
        await expect(assertFreeName(root, WORKSPACE, 'pedidos/nuevo')).resolves.toBeUndefined();
    });

    it('refuses a path that an item already holds', async () => {
        await expect(assertFreeName(root, WORKSPACE, 'pedidos/uno')).rejects.toBeInstanceOf(
            NameTakenError,
        );
    });

    it('refuses a path that a folder already holds: one row per name', async () => {
        await expect(assertFreeName(root, WORKSPACE, 'pedidos/ayer')).rejects.toBeInstanceOf(
            NameTakenError,
        );
    });

    it('names the path that was taken in the error', async () => {
        await expect(assertFreeName(root, WORKSPACE, 'pedidos/uno')).rejects.toMatchObject({
            path: 'pedidos/uno',
        });
    });
});
