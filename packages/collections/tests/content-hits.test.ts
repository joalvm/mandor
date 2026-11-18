import type { CollectionSearchHit } from '@mandor/ipc';
import type { SearchEntry } from '@mandor/shell';
import { describe, expect, it } from 'vitest';

import { contentHits } from '../src/search/content-hits.js';

const PEDIDO: SearchEntry = {
    name: 'Crear pedido',
    resource: 'mandor://local/events/item/4t8k2m9x1c0d/h1j5r8p0y4e6',
    source: 'item',
    tags: ['cobro'],
    trail: 'Pedidos',
};

const NOTAS: SearchEntry = {
    name: 'Notas',
    resource: 'mandor://local/events/doc/9k2m4x7q1c3d',
    source: 'doc',
    tags: [],
    trail: '',
};

function hit(resource: string, line: number, source: 'doc' | 'item'): CollectionSearchHit {
    return { line, resource, source };
}

describe('the hits of content, read as the entries they belong to', () => {
    it('shows each hit as the name and the trail of the entry the window lists', () => {
        const hits = contentHits([PEDIDO, NOTAS], [hit(PEDIDO.resource, 3, 'item')]);

        expect(hits).toEqual([{ ...PEDIDO, matched: 'content' }]);
    });

    it('keeps one row per file, however many of its lines were found', () => {
        const hits = contentHits(
            [PEDIDO, NOTAS],
            [
                hit(NOTAS.resource, 1, 'doc'),
                hit(PEDIDO.resource, 3, 'item'),
                hit(NOTAS.resource, 9, 'doc'),
            ],
        );

        expect(hits.map((each) => each.name)).toEqual(['Notas', 'Crear pedido']);
    });

    it('leaves out a hit of nothing the window lists, as a file that is not an item', () => {
        const hits = contentHits(
            [PEDIDO],
            [hit('mandor://local/events/item/4t8k2m9x1c0d/collection.yaml', 4, 'item')],
        );

        expect(hits).toEqual([]);
    });

    it('says nothing when nothing matched', () => {
        expect(contentHits([PEDIDO, NOTAS], [])).toEqual([]);
    });
});
