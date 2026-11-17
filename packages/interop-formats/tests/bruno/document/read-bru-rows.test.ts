import { describe, expect, it } from 'vitest';

import { paramsOfBru, rowsOfBru, valueOfRow } from '../../../src/bruno/document/read-bru-rows.js';

describe('valueOfRow', () => {
    it('reads a text as itself and a list of paths as the first path', () => {
        expect(valueOfRow('x')).toBe('x');
        expect(valueOfRow(['a.png', 'b.png'])).toBe('a.png');
    });

    it('reads nothing from an empty list or a missing value', () => {
        expect(valueOfRow([])).toBe('');
        expect(valueOfRow(undefined)).toBe('');
        expect(valueOfRow(null)).toBe('');
    });
});

describe('rowsOfBru', () => {
    it('lists the rows, a switched-off row staying and a row with no switch being on', () => {
        expect(
            rowsOfBru([
                { name: 'a', value: '1', enabled: true },
                { name: 'b', value: '2', enabled: false },
                { name: 'c' },
                {},
            ]),
        ).toEqual([
            { name: 'a', value: '1', disabled: false },
            { name: 'b', value: '2', disabled: true },
            { name: 'c', value: '', disabled: false },
            { name: '', value: '', disabled: false },
        ]);
    });

    it('lists nothing for a table that is absent', () => {
        expect(rowsOfBru(undefined)).toEqual([]);
        expect(rowsOfBru(null)).toEqual([]);
    });
});

describe('paramsOfBru', () => {
    const rows = [
        { name: 'q', value: '1', type: 'query' },
        { name: 'id', value: '7', type: 'path' },
        { name: 'free', value: '2' },
    ];

    it('lists the parameters of one kind, a parameter with no kind being a query one', () => {
        expect(paramsOfBru(rows, 'query').map((row) => row.name)).toEqual(['q', 'free']);
        expect(paramsOfBru(rows, 'path').map((row) => row.name)).toEqual(['id']);
    });

    it('lists nothing for a table that is absent', () => {
        expect(paramsOfBru(undefined, 'path')).toEqual([]);
    });
});
