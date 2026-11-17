import type { CollectionNode } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { isGroup } from '../src/lib/group-nodes.js';
import { collectionRows } from '../src/lib/collection-rows.js';

import { TWO_FOLDERS } from './support/two-folders.js';

describe('flattening the tree into rows', () => {
    it('draws every folder and every item when nothing is folded', () => {
        const rows = collectionRows(TWO_FOLDERS, [], []);

        expect(rows.map((row) => row.node.path)).toEqual([
            'pedidos',
            'pedidos/pedido-creado',
            'pedidos/pedido-pagado',
            'envios',
            'envios/envio-creado',
            'envios/envio-anulado',
        ]);
    });

    it('counts the level from one, so a child of the top level is level two', () => {
        const rows = collectionRows(TWO_FOLDERS, [], []);

        expect(rows.map((row) => row.level)).toEqual([1, 2, 2, 1, 2, 2]);
    });

    it('leaves the children of a folded folder out', () => {
        const rows = collectionRows(TWO_FOLDERS, ['pedidos'], []);

        expect(rows.map((row) => row.node.path)).toEqual([
            'pedidos',
            'envios',
            'envios/envio-creado',
            'envios/envio-anulado',
        ]);
    });

    /** The rows are the lines of the tree: the id of a node, and whether a folder stands open. */
    it('says of every folder whether it is open, and nothing of an item', () => {
        const rows = collectionRows(TWO_FOLDERS, ['envios'], []);

        expect(rows.map(({ expanded, id, level }) => ({ expanded, id, level }))).toEqual([
            { expanded: true, id: 'pedidos', level: 1 },
            { expanded: undefined, id: 'pedidos/pedido-creado', level: 2 },
            { expanded: undefined, id: 'pedidos/pedido-pagado', level: 2 },
            { expanded: false, id: 'envios', level: 1 },
        ]);
    });

    /** The glyph a row wears follows the same question: what folds, and what opens a tab. */
    it('sees a collection and its folders as groups, and an item as a leaf', () => {
        expect(
            isGroup({ kind: 'collection', name: 'Pedidos', path: 'pedidos', children: [] }),
        ).toBe(true);
        expect(isGroup({ kind: 'folder', name: 'Ayer', path: 'pedidos/ayer', children: [] })).toBe(
            true,
        );
        expect(
            isGroup({
                kind: 'item',
                name: 'Pedido creado',
                path: 'pedidos/pedido-creado',
                itemKind: 'message',
                tags: [],
            }),
        ).toBe(false);
    });

    describe('an item with examples', () => {
        const LOGIN: CollectionNode = {
            kind: 'item',
            itemKind: 'request',
            name: 'Login',
            path: 'acceso/login',
            examples: [
                { key: 'Creado', name: 'Creado', mark: '201' },
                { key: 'Roto', name: 'Roto', mark: '500' },
            ],
            tags: [],
        };
        const TREE: CollectionNode[] = [
            { kind: 'collection', name: 'Acceso', path: 'acceso', children: [LOGIN] },
        ];

        it('stands open until somebody closes it, with the chevron saying so', () => {
            const rows = collectionRows(TREE, [], ['acceso/login']);

            expect(rows.map(({ expanded, id }) => ({ expanded, id }))).toEqual([
                { expanded: true, id: 'acceso' },
                { expanded: false, id: 'acceso/login' },
            ]);
        });

        it('draws one line under it for each example, a level further in', () => {
            const rows = collectionRows(TREE, [], []);

            expect(rows.map(({ expanded, id, level }) => ({ expanded, id, level }))).toEqual([
                { expanded: true, id: 'acceso', level: 1 },
                { expanded: true, id: 'acceso/login', level: 2 },
                { expanded: undefined, id: 'acceso/login:Creado', level: 3 },
                { expanded: undefined, id: 'acceso/login:Roto', level: 3 },
            ]);
        });

        it('hands the item and the example to the line of the example', () => {
            const [, , created] = collectionRows(TREE, [], []);

            expect(created?.node).toBe(LOGIN);
            expect(created?.example).toEqual({ key: 'Creado', name: 'Creado', mark: '201' });
        });

        it('leaves them out with their folder when it is folded', () => {
            const rows = collectionRows(TREE, ['acceso'], []);

            expect(rows.map((row) => row.id)).toEqual(['acceso']);
        });
    });
});
