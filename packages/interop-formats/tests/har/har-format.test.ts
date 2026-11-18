import { describe, expect, it } from 'vitest';

import { harFormat } from '../../src/har/har-format.js';

describe('harFormat', () => {
    it('is listed as a format that reads HAR and JSON and writes nothing', () => {
        expect(harFormat).toMatchObject({
            id: 'har',
            label: 'HAR',
            reads: ['har', 'json'],
            writes: [],
            scopes: ['collection'],
            input: 'file',
            unwritten: {},
        });
    });
});
