import { describe, expect, it } from 'vitest';

import { colonPathOf } from '../../src/export/colon-path-of.js';

describe('colonPathOf', () => {
    it('writes each whole segment in braces with a colon', () => {
        expect(colonPathOf('/pets/{petId}/owners/{ownerId}')).toBe('/pets/:petId/owners/:ownerId');
    });

    it('rewrites a parameter followed by the query or the fragment', () => {
        expect(colonPathOf('/pets/{petId}?limit=1')).toBe('/pets/:petId?limit=1');
        expect(colonPathOf('/pets/{petId}#top')).toBe('/pets/:petId#top');
    });

    it('leaves a brace inside a word and a reference to a variable alone', () => {
        expect(colonPathOf('{{host}}/v{version}/pets')).toBe('{{host}}/v{version}/pets');
    });
});
