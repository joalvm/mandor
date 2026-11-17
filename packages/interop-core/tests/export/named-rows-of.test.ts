import { describe, expect, it } from 'vitest';

import { namedRowsOf } from '../../src/export/named-rows-of.js';

describe('namedRowsOf', () => {
    it('names each row and marks the ones switched off', () => {
        expect(
            namedRowsOf([
                { key: 'limit', value: '10', enabled: true },
                { key: 'debug', value: '1', enabled: false },
            ]),
        ).toEqual([
            { name: 'limit', value: '10' },
            { name: 'debug', value: '1', disabled: true },
        ]);
    });

    it('leaves out a row with no key', () => {
        expect(namedRowsOf([{ key: '', value: 'x', enabled: true }])).toEqual([]);
    });
});
