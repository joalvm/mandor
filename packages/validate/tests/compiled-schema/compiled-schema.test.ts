import { describe, expect, it } from 'vitest';

import { compileSchema as compileNode } from 'json-schema-library';

import { compiledSchema, schemaOf } from '../../src/compiled-schema/compiled-schema.js';
import { schemaPlacesOf } from '../../src/schema-places/schema-places.js';

describe('compiledSchema', () => {
    it('carries the text it was read from, and keeps the schema behind the box', () => {
        const read = { node: compileNode({ type: 'object' }), places: schemaPlacesOf({}) };
        const schema = compiledSchema('{"type": "object"}', read);

        expect(schema.source).toBe('{"type": "object"}');
        expect(schemaOf(schema)).toBe(read);
    });
});
