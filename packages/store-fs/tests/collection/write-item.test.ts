import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { itemFile } from '../../src/collection/collection-path.js';
import { readItem } from '../../src/collection/read-item.js';
import { writeItem } from '../../src/collection/write-item.js';
import { createCollection, createWorkspace, writeRepoTree } from '../../src/index.js';
import { mountCollection } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-write-item-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
    await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing one item', () => {
    it('creates the file, folders included, when the item is new', async () => {
        await writeItem(root, WORKSPACE, 'pedidos/ayer/viejo', {
            kind: 'message',
            name: 'Viejo',
            tags: ['a'],
            body: { channel: 'x.y' },
        });

        expect(await readItem(root, WORKSPACE, 'pedidos/ayer/viejo')).toEqual({
            kind: 'message',
            name: 'Viejo',
            tags: ['a'],
            body: { channel: 'x.y' },
        });
    });

    it('keeps the comments and the unknown keys of a file that was already there', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/uno.yaml': '# a hand wrote this\nkind: message\nname: Uno\nextra: kept\n',
        });

        await writeItem(root, WORKSPACE, 'pedidos/uno', {
            kind: 'message',
            name: 'Uno renombrado',
            tags: [],
            body: { extra: 'kept' },
        });

        const text = await readFile(itemFile(root, WORKSPACE, 'pedidos/uno'), 'utf8');

        expect(text).toContain('# a hand wrote this');
        expect(text).toContain('name: Uno renombrado');
        expect(text).toContain('extra: kept');
    });

    /** A file that exists and is not an item says something; writing over it destroys it. */
    it('refuses to overwrite a file that is not an item, and leaves it as it was', async () => {
        const file = itemFile(root, WORKSPACE, 'pedidos/ajeno');

        await mountCollection(root, WORKSPACE, { 'pedidos/ajeno.yaml': 'tags: 3\n' });

        await expect(
            writeItem(root, WORKSPACE, 'pedidos/ajeno', {
                kind: 'message',
                name: 'Ajeno',
                tags: [],
                body: {},
            }),
        ).rejects.toThrow();

        expect(await readFile(file, 'utf8')).toBe('tags: 3\n');
    });

    it('refuses a file that cannot be parsed at all, without touching it', async () => {
        const file = itemFile(root, WORKSPACE, 'pedidos/roto');

        await writeFile(file, 'kind: [message\n', 'utf8');

        await expect(
            writeItem(root, WORKSPACE, 'pedidos/roto', {
                kind: 'message',
                name: 'Roto',
                tags: [],
                body: {},
            }),
        ).rejects.toThrow();

        expect(await readFile(file, 'utf8')).toBe('kind: [message\n');
    });
});
