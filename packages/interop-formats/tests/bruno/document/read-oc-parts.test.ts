import { describe, expect, it } from 'vitest';

import { descriptionTextOf, paramsOf, rowsOf } from '../../../src/bruno/document/read-oc-parts.js';

describe('descriptionTextOf', () => {
    it('reads the text of a description in either of its forms', () => {
        expect(descriptionTextOf('hola')).toBe('hola');
        expect(descriptionTextOf({ content: 'hola', type: 'text/markdown' })).toBe('hola');
    });

    it('is empty when there is none or it says nothing', () => {
        expect(descriptionTextOf(undefined)).toBe('');
        expect(descriptionTextOf(null)).toBe('');
        expect(descriptionTextOf({ type: 'text/markdown' })).toBe('');
    });
});

describe('rowsOf', () => {
    it('lists the rows, keeping the ones that are switched off', () => {
        expect(
            rowsOf([
                { name: 'a', value: '1' },
                { name: 'b', disabled: true },
            ]),
        ).toEqual([
            { name: 'a', value: '1', disabled: false },
            { name: 'b', value: '', disabled: true },
        ]);
    });

    it('lists nothing for a table that is absent', () => {
        expect(rowsOf(undefined)).toEqual([]);
        expect(rowsOf(null)).toEqual([]);
        expect(rowsOf([{}])).toEqual([{ name: '', value: '', disabled: false }]);
    });
});

describe('paramsOf', () => {
    const rows = [
        { name: 'q', value: '1', type: 'query' },
        { name: 'id', value: '7', type: 'path' },
        { name: 'free', value: '2' },
    ];

    it('lists the parameters of one kind, a parameter with no kind being a query one', () => {
        expect(paramsOf(rows, 'query').map((row) => row.name)).toEqual(['q', 'free']);
        expect(paramsOf(rows, 'path').map((row) => row.name)).toEqual(['id']);
    });

    it('lists nothing for a table that is absent', () => {
        expect(paramsOf(undefined, 'query')).toEqual([]);
    });
});
