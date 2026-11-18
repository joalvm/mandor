import { describe, expect, it } from 'vitest';

import { namedApart } from '../../src/import/named-apart.js';

describe('namedApart', () => {
    it('keeps the names that already differ', () => {
        const named = namedApart([{ name: 'A' }, { name: 'B' }], 'Format');

        expect(named.map((document) => document.name)).toEqual(['A', 'B']);
    });

    it('numbers the later of two documents with one name', () => {
        const named = namedApart([{ name: 'A' }, { name: 'A' }, { name: 'A' }], 'Format');

        expect(named.map((document) => document.name)).toEqual(['A', 'A (2)', 'A (3)']);
    });

    it('gives a document with no name the word of its format', () => {
        const named = namedApart([{ name: ' ', size: 1 }], 'Format');

        expect(named).toEqual([{ name: 'Format', size: 1 }]);
    });
});
