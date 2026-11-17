import { describe, expect, it } from 'vitest';

import { jsonRecordOf } from '../../../src/openapi/import/json-record.js';

describe('reading a text that should be a JSON object', () => {
    it('gives the object, and an empty one for anything else', () => {
        expect(jsonRecordOf('{"a":1}')).toEqual({ a: 1 });
        expect(jsonRecordOf('[1]')).toEqual({});
        expect(jsonRecordOf('not json')).toEqual({});
        expect(jsonRecordOf(undefined)).toEqual({});
    });
});
