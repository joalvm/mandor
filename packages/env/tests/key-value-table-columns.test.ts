import { describe, expect, it } from 'vitest';

import { tableColumnsOf } from '../src/components/key-value/key-value-table-columns.js';

describe('a table whose lines send nothing', () => {
    it('has no track for the switch', () => {
        const ids = tableColumnsOf({ description: false, value: true }, false).map(
            (column) => column.id,
        );

        expect(ids).toEqual(['handle', 'key', 'value']);
    });
});

describe('the columns of a table of pairs', () => {
    it('leads with the handle and the switch, then the key and the columns in force', () => {
        expect(
            tableColumnsOf({ description: true, value: false }).map((column) => column.id),
        ).toEqual(['handle', 'check', 'key', 'description']);
    });

    it('gives the description the widest share and the value the narrowest', () => {
        const weights = tableColumnsOf({ description: true, value: true }).flatMap((column) =>
            column.kind === 'fluid' ? [column.weight] : [],
        );

        expect(weights).toEqual([1.1, 1, 1.2]);
    });
});
