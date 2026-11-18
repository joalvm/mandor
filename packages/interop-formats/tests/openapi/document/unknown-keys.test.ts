import { describe, expect, it } from 'vitest';

import { unknownKeys } from '../../../src/openapi/document/unknown-keys.js';

describe('the keys no mapping claimed', () => {
    it('keeps what the mapping does not know, extensions included, as it was written', () => {
        const node = { summary: 'List', deprecated: true, 'x-owner': { team: 'pets' } };

        expect(unknownKeys(node, ['summary'])).toEqual({
            deprecated: true,
            'x-owner': { team: 'pets' },
        });
    });

    it('is empty when everything was claimed', () => {
        expect(unknownKeys({ summary: 'List' }, ['summary'])).toEqual({});
    });
});
