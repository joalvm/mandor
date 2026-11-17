import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionsFile } from '../../src/collection/collection-path.js';
import { readCollectionsFile } from '../../src/collection/read-collections-file.js';
import { createCollection, createWorkspace, writeRepoTree } from '../../src/index.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';
const NOBODY_ARRANGED = { order: [], origin: undefined };

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the arrangement of the top level (read-collections-file)', () => {
    it('reads the order the collections were created in', async () => {
        await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
        await createCollection(root, WORKSPACE, { id: 'pagos', name: 'Pagos' });

        expect((await readCollectionsFile(root, WORKSPACE)).order).toEqual(['pedidos', 'pagos']);
    });

    it('answers with an empty order when there is no file', async () => {
        expect(await readCollectionsFile(root, 'no-existe')).toEqual(NOBODY_ARRANGED);
    });

    /** Losing the arrangement never loses the work: the tree is on disk. */
    it('answers with an empty order when nobody can read the file', async () => {
        await createCollection(root, WORKSPACE, { id: 'pedidos', name: 'Pedidos' });
        await writeFile(collectionsFile(root, WORKSPACE), 'order: [unclosed\n', 'utf8');

        expect(await readCollectionsFile(root, WORKSPACE)).toEqual(NOBODY_ARRANGED);
    });
});
