import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readItem } from '../../src/collection/read-item.js';
import { FileReadError } from '../../src/disk/file-read-error.js';
import { createCollection, createWorkspace, writeRepoTree } from '../../src/index.js';
import { mountCollection } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-read-item-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reading one item', () => {
    it('answers the envelope and the body, body included', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/uno.yaml': 'kind: message\nname: Uno\ntags:\n  - pagos\nchannel: a.b\n',
        });

        const item = await readItem(root, WORKSPACE, 'pedidos/uno');

        expect(item.kind).toBe('message');
        expect(item.name).toBe('Uno');
        expect(item.tags).toEqual(['pagos']);
        expect(item.body).toEqual({ channel: 'a.b' });
    });

    it('refuses an item whose file is not there', async () => {
        await expect(readItem(root, WORKSPACE, 'pedidos/ausente')).rejects.toBeInstanceOf(
            FileReadError,
        );
    });

    it('refuses a file that is not an item', async () => {
        await mountCollection(root, WORKSPACE, { 'pedidos/roto.yaml': 'tags: 3\n' });

        await expect(readItem(root, WORKSPACE, 'pedidos/roto')).rejects.toBeInstanceOf(
            FileReadError,
        );
    });
});
