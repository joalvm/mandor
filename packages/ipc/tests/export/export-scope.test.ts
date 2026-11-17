import { describe, expect, it } from 'vitest';

import { namesItsCollection } from '../../src/export/export-scope.js';

describe('a scope and the collection it names (namesItsCollection)', () => {
    it('agrees when a collection scope names its collection', () => {
        expect(namesItsCollection({ scope: 'collection', collection: 'tienda' })).toBe(true);
    });

    it('agrees when the workspace scope names none', () => {
        expect(namesItsCollection({ scope: 'workspace' })).toBe(true);
        expect(namesItsCollection({ scope: 'workspace', collection: undefined })).toBe(true);
    });

    it('disagrees when a collection scope names none, or the workspace scope names one', () => {
        expect(namesItsCollection({ scope: 'collection' })).toBe(false);
        expect(namesItsCollection({ scope: 'workspace', collection: 'tienda' })).toBe(false);
    });
});
