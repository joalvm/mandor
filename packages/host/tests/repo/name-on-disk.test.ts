import { mkdir, mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { MAX_FILE_BYTES } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nameOnDisk } from '../../src/repo/name-on-disk.js';

const WS = 'workspaces/pagos';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function write(path: string, text: string): Promise<void> {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text, 'utf8');
}

describe('the name of a file of the repo, read from disk (name-on-disk)', () => {
    it('reads the name an item carries, not the segment it lives under', async () => {
        await write(`${WS}/collections/pedidos/x9k2m4p7q1w3.yaml`, 'kind: message\nname: Crear\n');

        await expect(nameOnDisk(root, `${WS}/collections/pedidos/x9k2m4p7q1w3.yaml`)).resolves.toBe(
            'Crear',
        );
    });

    it('reads the name of a file that does not parse to the end', async () => {
        await write(`${WS}/environments/4t8k2m9x1c0d.yaml`, 'name: Producción\nvars: [a\n');

        await expect(nameOnDisk(root, `${WS}/environments/4t8k2m9x1c0d.yaml`)).resolves.toBe(
            'Producción',
        );
    });

    it('has no name for a file that is gone', async () => {
        await expect(nameOnDisk(root, `${WS}/connections/7h3n5v8b2z4q.yaml`)).resolves.toBe('');
    });

    /** Every change seen on disk asks its name: a file of gigabytes must not be read for it. */
    it('has no name for a file too large to read', async () => {
        const path = `${WS}/collections/pedidos/x9k2m4p7q1w3.yaml`;

        await write(path, 'kind: message\nname: Crear\n');
        await truncate(join(root, path), MAX_FILE_BYTES + 1);

        await expect(nameOnDisk(root, path)).resolves.toBe('');
    });

    it('names the order of the collections of a workspace by its workspace', async () => {
        await write(`${WS}/workspace.yaml`, 'id: pagos\nkind: sync\nname: Tienda\n');
        await write(`${WS}/collections/collections.yaml`, 'order: [a]\n');

        await expect(nameOnDisk(root, `${WS}/collections/collections.yaml`)).resolves.toBe(
            'Tienda',
        );
    });

    it('names a doc by its title even once its file is gone', async () => {
        await expect(nameOnDisk(root, `${WS}/docs/Notas.md`)).resolves.toBe('Notas');
    });

    it('has no name for a path that is no entity of the repo', async () => {
        await expect(nameOnDisk(root, 'notes.txt')).resolves.toBe('');
    });
});
