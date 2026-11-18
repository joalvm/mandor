import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionEntries } from '../../src/collection/collection-entries.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

async function files(...names: string[]): Promise<void> {
    await Promise.all(names.map((name) => writeFile(join(dir, name), '')));
}

async function folders(...names: string[]): Promise<void> {
    await Promise.all(names.map((name) => mkdir(join(dir, name))));
}

function sorted(entries: { folders: string[]; items: string[] }) {
    return { folders: [...entries.folders].sort(), items: [...entries.items].sort() };
}

describe('collectionEntries', () => {
    it('lists folders by name and items by name without their extension', async () => {
        await folders('pedidos', 'cobros');
        await files('crear.yaml', 'borrar.yaml');

        expect(sorted(await collectionEntries(dir))).toEqual({
            folders: ['cobros', 'pedidos'],
            items: ['borrar', 'crear'],
        });
    });

    it('leaves out the files the collection keeps for itself', async () => {
        await files('collections.yaml', 'collection.yaml', 'folder.yaml', 'crear.yaml');

        expect(await collectionEntries(dir)).toEqual({ folders: [], items: ['crear'] });
    });

    it('leaves out a file of another extension', async () => {
        await files('notas.md', 'crear.json', 'crear.yaml');

        expect(await collectionEntries(dir)).toEqual({ folders: [], items: ['crear'] });
    });

    it('leaves out what the domain could not name as a path id', async () => {
        await folders('Pedidos', '-cobros');
        await files('Crear.yaml', 'dos palabras.yaml', 'año.yaml');

        expect(await collectionEntries(dir)).toEqual({ folders: [], items: ['año'] });
    });

    it('answers nothing for a directory that does not exist', async () => {
        expect(await collectionEntries(join(dir, 'ninguno'))).toEqual({ folders: [], items: [] });
    });
});
