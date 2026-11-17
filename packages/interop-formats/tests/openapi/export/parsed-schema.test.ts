import { describe, expect, it } from 'vitest';

import { parsedSchema } from '../../../src/openapi/export/parsed-schema.js';

describe('the schema of a status as the document speaks it', () => {
    it('reads the text as the object it is', () => {
        expect(parsedSchema('{"type":"object"}')).toEqual({ type: 'object' });
    });

    it('says nothing for no text or an empty one', () => {
        expect(parsedSchema(undefined)).toBeUndefined();
        expect(parsedSchema('')).toBeUndefined();
    });

    it('says nothing for text that is not JSON or not an object', () => {
        expect(parsedSchema('{"type":')).toBeUndefined();
        expect(parsedSchema('[1]')).toBeUndefined();
        expect(parsedSchema('"text"')).toBeUndefined();
    });
});
