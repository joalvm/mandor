import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CollectionSetNode } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, writeRepoTree, readCollectionTree } from '../../src/index.js';
import { mountCollection, TWO_FOLDERS } from './support/mounted-collection.js';

let root: string;

const WORKSPACE = 'eventos-de-pagos';

async function namesOf(): Promise<string[]> {
    const { nodes } = await readCollectionTree(root, WORKSPACE);

    return nodes.map((node) => node.path);
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reading the collection of a workspace', () => {
    it('walks two folders and four items in the order their files state', async () => {
        await mountCollection(root, WORKSPACE, TWO_FOLDERS);

        const { nodes } = await readCollectionTree(root, WORKSPACE);
        const [pedidos, envios] = nodes as CollectionSetNode[];

        expect(nodes.map((node) => node.path)).toEqual(['pedidos', 'envios']);
        expect(pedidos?.children.map((child) => child.path)).toEqual([
            'pedidos/pedido-pagado',
            'pedidos/pedido-creado',
        ]);
        expect(envios?.children.map((child) => child.path)).toEqual([
            'envios/envio-creado',
            'envios/envio-entregado',
        ]);
    });

    it('carries the visible name and the kind of every item, and no body', async () => {
        await mountCollection(root, WORKSPACE, TWO_FOLDERS);

        const { nodes } = await readCollectionTree(root, WORKSPACE);
        const [pedidos] = nodes as CollectionSetNode[];

        expect(pedidos?.name).toBe('Pedidos');
        expect(pedidos?.children[1]).toEqual({
            kind: 'item',
            itemKind: 'message',
            name: 'Pedido creado',
            path: 'pedidos/pedido-creado',
            tags: ['pagos'],
        });
    });

    it('carries the method of a request as the mark its row wears', async () => {
        await mountCollection(root, WORKSPACE, {
            'acceso/collection.yaml': 'name: Acceso\norder:\n  - login\n',
            'acceso/login.yaml': 'kind: request\nname: Login\nmethod: POST\n',
        });

        const { nodes } = await readCollectionTree(root, WORKSPACE);
        const leaves = nodes.flatMap((node) => (node.kind === 'item' ? [node] : node.children));

        expect(leaves[0]).toMatchObject({ itemKind: 'request', mark: 'POST' });
    });

    it('lists the examples of a request under it with the status as their mark', async () => {
        await mountCollection(root, WORKSPACE, {
            'acceso/collection.yaml': 'name: Acceso\norder:\n  - login\n',
            'acceso/login.yaml':
                'kind: request\nname: Login\nmethod: POST\nexamples:\n' +
                '  - {name: Creado, status: "201", contentType: a, body: b}\n' +
                '  - {name: Roto, status: "500", contentType: a, body: b}\n',
        });

        const { nodes } = await readCollectionTree(root, WORKSPACE);
        const leaves = nodes.flatMap((node) => (node.kind === 'item' ? [node] : node.children));

        expect(leaves[0]).toMatchObject({
            examples: [
                { key: 'Creado', name: 'Creado', mark: '201' },
                { key: 'Roto', name: 'Roto', mark: '500' },
            ],
        });
    });

    /** A repo merged by hand states an order nobody can trust, and the view holds anyway. */
    it('reconciles an order that names what is gone and forgets what is there', async () => {
        await mountCollection(root, WORKSPACE, {
            ...TWO_FOLDERS,
            'collections.yaml': 'order:\n  - borrada\n  - envios\n',
        });

        expect(await namesOf()).toEqual(['envios', 'pedidos']);
    });

    it('reads a collection nobody arranged in the order of the names', async () => {
        await mountCollection(root, WORKSPACE, {
            'zeta/collection.yaml': 'name: Zeta\n',
            'alfa/collection.yaml': 'name: Alfa\n',
        });

        expect(await namesOf()).toEqual(['alfa', 'zeta']);
    });

    it('calls a folder without a file by the name of its directory', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/pedido-creado.yaml': 'kind: message\nname: X\n',
        });

        const { nodes } = await readCollectionTree(root, WORKSPACE);

        expect(nodes[0]?.name).toBe('pedidos');
    });

    it('leaves out an item it cannot read and says which file it was', async () => {
        await mountCollection(root, WORKSPACE, {
            'pedidos/collection.yaml': 'name: Pedidos\n',
            'pedidos/pedido-creado.yaml': 'kind: message\nname: Pedido creado\n',
            'pedidos/roto.yaml': 'kind: 1\n',
        });

        const { nodes, warnings } = await readCollectionTree(root, WORKSPACE);
        const [pedidos] = nodes as CollectionSetNode[];

        expect(pedidos?.children.map((child) => child.path)).toEqual(['pedidos/pedido-creado']);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.path).toContain('roto.yaml');
    });

    it('says about the collection what its file says', async () => {
        await mountCollection(root, WORKSPACE, {
            'petstore/collection.yaml':
                'name: Swagger Petstore\ndescription: One collection per document\n',
        });

        const { nodes } = await readCollectionTree(root, WORKSPACE);

        expect(nodes[0]).toMatchObject({
            kind: 'collection',
            name: 'Swagger Petstore',
            description: 'One collection per document',
        });
    });

    it('answers with nothing for a workspace that has no collection yet', async () => {
        expect(await readCollectionTree(root, WORKSPACE)).toEqual({ nodes: [], warnings: [] });
    });

    it('ignores files and folders the domain would refuse to name', async () => {
        await mountCollection(root, WORKSPACE, {
            'notas.txt': 'no soy un item\n',
            'Mayusculas/collection.yaml': 'name: No\n',
            'pedidos/collection.yaml': 'name: Pedidos\n',
        });

        expect(await namesOf()).toEqual(['pedidos']);
    });
});
