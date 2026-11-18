import { describe, expect, it } from 'vitest';

import { itemEntries } from '../src/search/item-entries.js';

import { TWO_FOLDERS } from './support/two-folders.js';

describe('building search entries from the collection', () => {
    it('makes one entry per item, with the names of what holds it in its trail', () => {
        const entries = itemEntries(TWO_FOLDERS, 'Local', 'ws');

        expect(entries.map((each) => each.trail)).toEqual([
            'Pedidos',
            'Pedidos',
            'Envios',
            'Envios',
        ]);
    });

    it('names every holder from the outermost, by what the tree calls it and never by its path', () => {
        const entries = itemEntries(
            [
                {
                    children: [
                        {
                            children: [
                                {
                                    itemKind: 'request',
                                    kind: 'item',
                                    name: 'Change',
                                    path: '4t8k2m9x1c0d/q7w3n5v6b2za/h1j5r8p0y4e6',
                                    tags: [],
                                },
                            ],
                            kind: 'folder',
                            name: 'Forget Password',
                            path: '4t8k2m9x1c0d/q7w3n5v6b2za',
                        },
                    ],
                    kind: 'collection',
                    name: 'Session',
                    path: '4t8k2m9x1c0d',
                },
            ],
            'Local',
            'ws',
        );

        expect(entries[0]?.trail).toBe('Session / Forget Password');
    });

    it('has a trail for a loose item of nothing: an empty one', () => {
        const entries = itemEntries(
            [{ kind: 'item', itemKind: 'message', name: 'Pago', path: 'pago', tags: [] }],
            'Local',
            'ws',
        );

        expect(entries[0]?.trail).toBe('');
    });

    it('gives every entry the resource of its item', () => {
        const entries = itemEntries(TWO_FOLDERS, 'Local', 'ws');

        expect(entries[0]?.resource).toBe('mandor://local/ws/item/pedidos/pedido-creado');
        expect(entries[0]?.source).toBe('item');
    });

    it('makes no entry for a folder: a folder has no resource to open', () => {
        const entries = itemEntries(TWO_FOLDERS, 'Local', 'ws');

        expect(entries.every((each) => each.source === 'item')).toBe(true);
    });

    it('carries the tags of the item', () => {
        const entries = itemEntries(
            [{ kind: 'item', itemKind: 'message', name: 'Pago', path: 'pago', tags: ['cobro'] }],
            'Local',
            'ws',
        );

        expect(entries[0]?.tags).toEqual(['cobro']);
    });
});
