import { describe, expect, it } from 'vitest';

import { allSpotsOf } from '../../src/schema-strictness/schema-spots.js';

describe('allSpotsOf', () => {
    it('finds every schema inside a schema, in place or not, the schema first', () => {
        const schema = {
            properties: { a: { items: [{ type: 'string' }] } },
            allOf: [{ properties: { b: {} } }, true],
            $defs: { c: {} },
            not: 'nada',
            patternProperties: 5,
        };

        expect(allSpotsOf(schema).map((spot) => [spot.path.join('/'), spot.inPlace])).toEqual([
            ['', false],
            ['properties/a', false],
            ['properties/a/items/0', false],
            ['allOf/0', true],
            ['allOf/0/properties/b', false],
            ['$defs/c', false],
        ]);
    });

    it('finds nothing in a schema that is no object', () => {
        expect(allSpotsOf(true)).toEqual([]);
        expect(allSpotsOf([{}])).toEqual([]);
    });
});
