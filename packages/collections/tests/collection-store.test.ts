import type { CollectionNode } from '@mandor/schema';
import { beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/index.js';

import { TWO_FOLDERS } from './support/two-folders.js';

function item(path: string, examples: boolean): CollectionNode {
    const shown = examples ? { examples: [{ key: 'Creado', name: 'Creado' }] } : {};

    return { kind: 'item', itemKind: 'request', name: path, path, tags: [], ...shown };
}

/** Groups two deep and items with examples at each depth, so a fold has more than a line to close. */
const DEEP: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Acceso',
        path: 'acceso',
        children: [
            {
                kind: 'folder',
                name: 'Viejos',
                path: 'acceso/viejos',
                children: [item('acceso/viejos/login', true), item('acceso/viejos/ping', false)],
            },
            item('acceso/logout', true),
        ],
    },
    {
        kind: 'collection',
        name: 'Envios',
        path: 'envios',
        children: [{ kind: 'folder', name: 'Rutas', path: 'envios/rutas', children: [] }],
    },
];

function sorted(paths: readonly string[] | undefined): string[] {
    return [...(paths ?? [])].sort();
}

beforeEach(() => {
    collectionStore.getState().reset();
});

describe('what the collection keeps taken (collectionStore)', () => {
    it('takes many paths at once, as the tree hands them over', () => {
        collectionStore.getState().setSelected(['envios', 'pedidos']);

        expect(collectionStore.getState().selected).toEqual(['envios', 'pedidos']);
    });

    /** A path deleted or moved away is not taken any more: a key pressed later would miss it. */
    it('lets go of whatever the tree read from disk no longer holds', () => {
        collectionStore.getState().setSelected(['pedidos/pedido-creado', 'gone']);
        collectionStore.getState().setNodes(TWO_FOLDERS);

        expect(collectionStore.getState().selected).toEqual(['pedidos/pedido-creado']);
    });

    it('holds what waits for an answer to its deletion until the answer is given', () => {
        collectionStore.getState().setDeleting(['pedidos', 'envios']);

        expect(collectionStore.getState().deleting).toEqual(['pedidos', 'envios']);

        collectionStore.getState().setDeleting(null);

        expect(collectionStore.getState().deleting).toBeNull();
    });

    it('keeps taken the example a read of the tree still lists, and lets go of one it dropped', () => {
        const nodes: CollectionNode[] = [
            {
                kind: 'item',
                itemKind: 'request',
                name: 'Login',
                path: 'login',
                examples: [{ key: 'Creado', name: 'Creado' }],
                tags: [],
            },
        ];

        collectionStore.getState().setSelected(['login:Creado', 'login:Roto']);
        collectionStore.getState().setNodes(nodes);

        expect(collectionStore.getState().selected).toEqual(['login:Creado']);
    });

    /** Like the folded ones: what is written down is what somebody closed. */
    it('writes down the items whose examples someone closed, per workspace, once each', () => {
        collectionStore.getState().openExamples('events', 'login', false);
        collectionStore.getState().openExamples('events', 'login', false);
        collectionStore.getState().openExamples('events', 'logout', false);
        collectionStore.getState().openExamples('events', 'login', true);

        expect(collectionStore.getState().examplesClosed).toEqual({ events: ['logout'] });
    });
});

describe('what folding a line closes (collectionStore)', () => {
    beforeEach(() => {
        collectionStore.getState().setNodes(DEEP);
    });

    /** Closing a line closes what it holds, so opening it again shows only its first level. */
    it('closes every folder and example under the line it folds, at every depth', () => {
        collectionStore.getState().fold('events', 'acceso', true);

        expect(sorted(collectionStore.getState().folded['events'])).toEqual([
            'acceso',
            'acceso/viejos',
        ]);
        expect(sorted(collectionStore.getState().examplesClosed['events'])).toEqual([
            'acceso/logout',
            'acceso/viejos/login',
        ]);

        collectionStore.getState().fold('events', 'acceso', false);

        expect(collectionStore.getState().folded['events']).toEqual(['acceso/viejos']);
    });

    it('closes the whole tree at once, and nothing of another workspace', () => {
        collectionStore.getState().fold('billing', 'facturas', true);
        collectionStore.getState().foldAll('events');

        expect(sorted(collectionStore.getState().folded['events'])).toEqual([
            'acceso',
            'acceso/viejos',
            'envios',
            'envios/rutas',
        ]);
        expect(sorted(collectionStore.getState().examplesClosed['events'])).toEqual([
            'acceso/logout',
            'acceso/viejos/login',
        ]);
        expect(collectionStore.getState().folded['billing']).toEqual(['facturas']);
    });

    it('closes what a collection holds and leaves the collection open on its first level', () => {
        collectionStore.getState().fold('events', 'acceso', true);
        collectionStore.getState().foldInside('events', 'acceso');

        expect(collectionStore.getState().folded['events']).toEqual(['acceso/viejos']);
        expect(sorted(collectionStore.getState().examplesClosed['events'])).toEqual([
            'acceso/logout',
            'acceso/viejos/login',
        ]);
    });
});
