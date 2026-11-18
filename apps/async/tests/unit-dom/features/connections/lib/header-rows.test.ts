import { describe, expect, it } from 'vitest';

import {
    headersOf,
    repeatedNames,
    rowsOf,
    sameHeaders,
    withNewRow,
    type HeaderRow,
} from '../../../../../src/renderer/features/connections/lib/header-rows.js';

function row(id: string, name: string, value: string): HeaderRow {
    return { id, name, value };
}

describe('the lines a record of headers is edited as', () => {
    it('opens one line per header, in the order the record keeps them', () => {
        expect(rowsOf({ Authorization: 'Bearer token', 'X-Trace': '1' })).toEqual([
            row('0', 'Authorization', 'Bearer token'),
            row('1', 'X-Trace', '1'),
        ]);
    });

    it('writes back the headers the lines name', () => {
        expect(headersOf([row('0', 'X-Trace', '1')])).toEqual({ 'X-Trace': '1' });
    });

    it('leaves a line with no name out of the record', () => {
        expect(headersOf([row('0', 'X-Trace', '1'), row('1', '', '')])).toEqual({ 'X-Trace': '1' });
    });

    it('reports the name two lines claim at once', () => {
        const repeated = repeatedNames([row('0', 'X-Trace', '1'), row('1', 'X-Trace', '2')]);

        expect([...repeated]).toEqual(['X-Trace']);
    });

    it('holds nothing against several lines that are still unnamed', () => {
        const repeated = repeatedNames([row('0', '', ''), row('1', '', '')]);

        expect([...repeated]).toEqual([]);
    });

    it('reads two records as the same when they say the same thing', () => {
        expect(sameHeaders({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
        expect(sameHeaders({ a: '1' }, { a: '2' })).toBe(false);
        expect(sameHeaders({ a: '1' }, { a: '1', b: '2' })).toBe(false);
    });

    it('opens the new line under an identity no other line holds', () => {
        const rows = withNewRow([row('0', 'X-Trace', '1'), row('1', '', '')]);

        expect(rows).toHaveLength(3);
        expect(new Set(rows.map((each) => each.id)).size).toBe(3);
    });
});
