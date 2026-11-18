import type { SearchEntry } from '@mandor/shell';
import { describe, expect, it } from 'vitest';

import { MIN_SEARCH_QUERY, searchWorkspace } from '../src/search/search-workspace.js';

function entry(name: string, trail: string, tags: readonly string[] = []): SearchEntry {
    return {
        name,
        resource: `mandor://local/ws/item/${name.toLowerCase().replaceAll(' ', '-')}`,
        source: 'item',
        tags,
        trail,
    };
}

describe('searching the workspace in memory', () => {
    it('returns nothing below the minimum query length', () => {
        const entries = [entry('Pedido creado', 'Pedidos')];

        expect(MIN_SEARCH_QUERY).toBe(2);
        expect(searchWorkspace(entries, '')).toEqual([]);
        expect(searchWorkspace(entries, 'p')).toEqual([]);
    });

    it('matches by name without caring about case', () => {
        const entries = [entry('Pedido creado', 'Pedidos')];
        const hits = searchWorkspace(entries, 'PEDIDO');

        expect(hits).toHaveLength(1);
        expect(hits[0]?.matched).toBe('name');
    });

    it('ranks a name match above a trail match, and a trail match above a tag match', () => {
        const entries = [
            entry('Alta de envio', 'Envios', ['pedidos']),
            entry('Sin relacion', 'Pedidos / Varios'),
            entry('Pedidos semanales', 'Reportes'),
        ];
        const hits = searchWorkspace(entries, 'pedidos');

        expect(hits.map((hit) => hit.name)).toEqual([
            'Pedidos semanales',
            'Sin relacion',
            'Alta de envio',
        ]);
        expect(hits.map((hit) => hit.matched)).toEqual(['name', 'trail', 'tag']);
    });

    it('reports the resource and the source of each hit', () => {
        const entries = [entry('Pedido creado', 'Pedidos')];
        const hits = searchWorkspace(entries, 'creado');

        expect(hits[0]?.resource).toBe('mandor://local/ws/item/pedido-creado');
        expect(hits[0]?.source).toBe('item');
    });

    it('keeps the order the entries came in among equals', () => {
        const entries = [entry('Pedido uno', 'Pedidos'), entry('Pedido dos', 'Pedidos')];
        const hits = searchWorkspace(entries, 'pedido');

        expect(hits.map((hit) => hit.name)).toEqual(['Pedido uno', 'Pedido dos']);
    });

    it('lists an entry once even when several of its fields match', () => {
        const entries = [entry('Pedidos', 'Pedidos', ['pedidos'])];
        const hits = searchWorkspace(entries, 'pedidos');

        expect(hits).toHaveLength(1);
        expect(hits[0]?.matched).toBe('name');
    });
});
