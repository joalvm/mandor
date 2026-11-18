import { describe, expect, it } from 'vitest';

import type { AuthPlace } from '../../src/auth/auth-place.js';
import { authPlaceSchema } from '../../src/auth/auth-place-schema.js';

describe('authPlaceSchema', () => {
    it('accepts the workspace as a place of its own', () => {
        const place: AuthPlace = { kind: 'workspace' };

        expect(authPlaceSchema.parse(place)).toEqual(place);
    });

    it('accepts a folder by its collection path', () => {
        const place: AuthPlace = { kind: 'folder', path: 'pedidos/abril' };

        expect(authPlaceSchema.parse(place)).toEqual(place);
    });

    it('refuses a folder path that leaves the collection', () => {
        expect(() => authPlaceSchema.parse({ kind: 'folder', path: '../escape' })).toThrow();
    });
});
