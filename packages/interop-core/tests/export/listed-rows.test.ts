import { describe, expect, it } from 'vitest';

import { listedRows } from '../../src/export/listed-rows.js';

describe('listedRows', () => {
    it('writes the key with its rows', () => {
        expect(listedRows('headers', [{ name: 'Accept' }])).toEqual({
            headers: [{ name: 'Accept' }],
        });
    });

    it('writes no key for a table with no rows', () => {
        expect(listedRows('headers', [])).toEqual({});
    });
});
