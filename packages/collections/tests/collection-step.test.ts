import { describe, expect, it } from 'vitest';

import { spotOfStep } from '../src/lib/collection-step.js';
import type { CollectionNode } from '@mandor/schema';

import { TWO_FOLDERS } from './support/two-folders.js';

/** One collection with a folder in it: the steps a node inside a collection can take. */
const WITH_FOLDER: CollectionNode[] = [
    {
        kind: 'collection',
        name: 'Pedidos',
        path: 'pedidos',
        children: [
            { kind: 'folder', name: 'Ayer', path: 'pedidos/ayer', children: [] },
            {
                kind: 'item',
                itemKind: 'message',
                name: 'Pedido creado',
                path: 'pedidos/pedido-creado',
                tags: [],
            },
            {
                kind: 'item',
                itemKind: 'message',
                name: 'Pedido pagado',
                path: 'pedidos/pedido-pagado',
                tags: [],
            },
        ],
    },
    {
        kind: 'collection',
        name: 'Envios',
        path: 'envios',
        children: [
            {
                kind: 'item',
                itemKind: 'message',
                name: 'Envio creado',
                path: 'envios/envio-creado',
                tags: [],
            },
        ],
    },
];

describe('where a step of the keyboard leaves a node', () => {
    it('puts it above the sibling over it', () => {
        expect(spotOfStep(TWO_FOLDERS, 'pedidos/pedido-pagado', 'up')).toEqual({
            parent: 'pedidos',
            before: 'pedido-creado',
        });
    });

    it('answers nothing when there is no sibling over it', () => {
        expect(spotOfStep(TWO_FOLDERS, 'pedidos/pedido-creado', 'up')).toBeNull();
    });

    it('puts it below the sibling under it, which is the end when there are two', () => {
        expect(spotOfStep(TWO_FOLDERS, 'pedidos/pedido-creado', 'down')).toEqual({
            parent: 'pedidos',
            before: null,
        });
    });

    it('answers nothing when there is no sibling under it', () => {
        expect(spotOfStep(TWO_FOLDERS, 'pedidos/pedido-pagado', 'down')).toBeNull();
    });

    it('sends it into the folder over it, last of what that folder holds', () => {
        expect(spotOfStep(WITH_FOLDER, 'pedidos/pedido-creado', 'in')).toEqual({
            parent: 'pedidos/ayer',
            before: null,
        });
    });

    it('answers nothing when what is over it is an item and holds nothing', () => {
        expect(spotOfStep(TWO_FOLDERS, 'pedidos/pedido-pagado', 'in')).toBeNull();
    });

    it('sends a folder out to the top level, where it becomes a collection', () => {
        expect(spotOfStep(WITH_FOLDER, 'pedidos/ayer', 'out')).toEqual({
            parent: '',
            before: 'envios',
        });
    });

    it('answers nothing when the step would break the shape the collection holds', () => {
        // An item has no sibling at the top level, and a collection has none inside a folder.
        expect(spotOfStep(TWO_FOLDERS, 'pedidos/pedido-creado', 'out')).toBeNull();
        expect(spotOfStep(TWO_FOLDERS, 'envios', 'in')).toBeNull();
    });

    it('answers nothing when it is already at the top level', () => {
        expect(spotOfStep(TWO_FOLDERS, 'pedidos', 'out')).toBeNull();
    });
});
