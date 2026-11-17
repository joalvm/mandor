import { describe, expect, it } from 'vitest';

import { claimRoute, slugFor, type TakenRoutes } from '../../src/import/claim-route.js';

describe('slugFor', () => {
    it('is the name as an id, free of the ones taken', () => {
        expect(slugFor('Lista de Mascotas', [], 'request')).toBe('lista-de-mascotas');
        expect(slugFor('Lista', ['lista'], 'request')).toBe('lista-2');
        expect(slugFor('日本', [], 'request')).toBe('日本');
    });

    it('takes the word of its kind when the name cannot make an id', () => {
        expect(slugFor('★ ☆', [], 'request')).toBe('request');
        expect(slugFor('???', ['request'], 'request')).toBe('request-2');
    });
});

describe('claimRoute', () => {
    it('gives each child of a directory an id of its own, siblings sharing the directory', () => {
        const taken: TakenRoutes = new Map([['tienda', new Set<string>()]]);

        expect(claimRoute(taken, 'tienda', 'Lista', 'request')).toBe('tienda/lista');
        expect(claimRoute(taken, 'tienda', 'Lista', 'request')).toBe('tienda/lista-2');
        expect(claimRoute(taken, 'tienda/lista', 'Hijo', 'request')).toBe('tienda/lista/hijo');
    });

    it('keeps the id alone when the parent is the root', () => {
        const taken: TakenRoutes = new Map();

        expect(claimRoute(taken, '', 'Tienda', 'collection')).toBe('tienda');
        expect(claimRoute(taken, '', 'Tienda', 'collection')).toBe('tienda-2');
    });
});
