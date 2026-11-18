import { describe, expect, it } from 'vitest';

import { identifyRows, keyedRows } from '../../src/list/row-identity.js';

describe('the identity of the rows of a list', () => {
    it('prefers id, then name, then key, whichever every row of the three lists has as a string', () => {
        const both = [{ id: 'a', name: 'x' }];

        expect(identifyRows(both, both, both)?.field).toBe('id');
        expect(
            identifyRows([{ id: 'a', name: 'x' }], [{ name: 'x' }], [{ name: 'x' }])?.field,
        ).toBe('name');
        expect(identifyRows([{ key: 'k' }], [{ key: 'k' }], [])?.field).toBe('key');
    });

    it('gives no identity when a row lacks the field or holds something that is no string', () => {
        expect(identifyRows([{ key: 'k' }], [{ key: 'k' }, { value: 'v' }], [])).toBeUndefined();
        expect(identifyRows([{ id: 1, name: 2, key: 3 }], [], [])).toBeUndefined();
    });

    it('gives no identity to a list that holds anything but objects', () => {
        expect(identifyRows(['a'], [{ key: 'k' }], [])).toBeUndefined();
        expect(identifyRows([], [{ key: 'k' }], [['k']])).toBeUndefined();
    });

    it('hands the rows back as records, ready to be keyed', () => {
        const identified = identifyRows([], [{ key: 'k' }], [{ key: 'k', value: 'v' }]);

        expect(identified?.ours).toEqual([{ key: 'k' }]);
        expect(identified?.theirs).toEqual([{ key: 'k', value: 'v' }]);
        expect(identified?.base).toEqual([]);
    });

    it('numbers the repeats of a key, because a repeated key is legal', () => {
        const rows = [{ key: 'Accept' }, { key: 'Host' }, { key: 'Accept' }];

        expect([...keyedRows(rows, 'key').keys()]).toEqual(['Accept#0', 'Host#0', 'Accept#1']);
        expect(keyedRows(rows, 'key').get('Accept#1')).toBe(rows[2]);
    });
});
