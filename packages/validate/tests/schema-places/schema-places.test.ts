import { describe, expect, it } from 'vitest';

import { placeOf, schemaPlacesOf, segmentOf } from '../../src/schema-places/schema-places.js';

describe('schemaPlacesOf', () => {
    const schema = {
        properties: { 'a/b': { type: 'string' }, list: { items: [{ type: 'integer' }] } },
        enum: [{ type: 'string' }],
    };
    const places = schemaPlacesOf(schema);

    it('places a part of the schema by the object itself, keys escaped', () => {
        expect(placeOf(places, schema.properties['a/b'], 'type')).toBe('/properties/a~1b/type');
        expect(placeOf(places, schema, 'enum')).toBe('/enum');
    });

    it('places a part inside a list by its rank', () => {
        expect(placeOf(places, schema.properties.list.items[0], 'type')).toBe(
            '/properties/list/items/0/type',
        );
    });

    it('places a copy where a part writes the keyword the same way', () => {
        expect(placeOf(places, { type: 'integer' }, 'type')).toBe('/properties/list/items/0/type');
    });

    it('places nothing that is not a part, nor a copy of none', () => {
        expect(placeOf(places, false, 'false')).toBe('');
        expect(placeOf(places, { minimum: 3 }, 'minimum')).toBe('');
        expect(placeOf(places, {}, 'type')).toBe('');
    });

    it('never reads data as a part of the schema', () => {
        expect(placeOf(places, { type: 'string' }, 'type')).toBe('/properties/a~1b/type');
    });

    it('escapes the two characters a pointer segment cannot carry', () => {
        expect(segmentOf('~/x')).toBe('~0~1x');
    });
});
