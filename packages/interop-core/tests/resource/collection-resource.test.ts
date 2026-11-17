import { describe, expect, it } from 'vitest';

import { collectionResourceOf, underCollection } from '../../src/resource/collection-resource.js';

describe('the collection an import lands as', () => {
    it('takes the route from the name the document called itself', () => {
        const resource = collectionResourceOf({
            name: 'Pasarela de Pagos',
            origin: { kind: 'openapi', sourceId: 'documento@1' },
        });

        expect(resource.place).toBe('collection');
        expect(resource.route).toBe('pasarela-de-pagos');
        expect(resource.name).toBe('Pasarela de Pagos');
        expect(resource.fields).toEqual({ name: 'Pasarela de Pagos' });
    });

    it('takes the plain word for a name no route can keep', () => {
        const resource = collectionResourceOf({
            name: '★ ☆',
            origin: { kind: 'openapi', sourceId: 'documento@1' },
        });

        expect(resource.route).toBe('collection');
        expect(resource.name).toBe('★ ☆');
    });

    it('carries the description the document wrote about itself', () => {
        const resource = collectionResourceOf({
            name: 'Tienda',
            description: 'Lo que la tienda vende',
            origin: { kind: 'openapi', sourceId: 'documento@1' },
        });

        expect(resource.fields).toEqual({ name: 'Tienda', description: 'Lo que la tienda vende' });
    });

    it('files everything the document carries under its route', () => {
        expect(underCollection('tienda', 'mascotas/perros')).toBe('tienda/mascotas/perros');
        expect(underCollection('tienda', '')).toBe('tienda');
    });
});
