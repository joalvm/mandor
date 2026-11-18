import { describe, expect, it } from 'vitest';

import {
    bulkTextOf,
    cellColumnsOf,
    linesOfBulk,
    moveKeyValueLine,
    type KeyValueLine,
} from '../src/components/key-value/key-value-line.js';

function line(
    id: string,
    name: string,
    value = '',
    extra: Partial<KeyValueLine> = {},
): KeyValueLine {
    return {
        disabled: false,
        id,
        name,
        value,
        ...extra,
    };
}

describe('the lines of a key-value table', () => {
    it('carries a line to its new place and closes the gap it left', () => {
        const moved = moveKeyValueLine([line('0', 'a'), line('1', 'b'), line('2', 'c')], '0', 2);

        expect(moved.map((each) => each.id)).toEqual(['1', '2', '0']);
    });

    it('keeps the list when the line to carry is not there, and binds the place it lands on', () => {
        const lines = [line('0', 'a'), line('1', 'b')];

        expect(moveKeyValueLine(lines, 'x', 5).map((each) => each.id)).toEqual(['0', '1']);
        expect(moveKeyValueLine(lines, '0', 9).map((each) => each.id)).toEqual(['1', '0']);
    });

    it('names the cells the columns in force lay out, the key never moving', () => {
        expect(cellColumnsOf({ description: true, value: true })).toEqual([
            'key',
            'value',
            'description',
        ]);
        expect(cellColumnsOf({ description: false, value: true })).toEqual(['key', 'value']);
        expect(cellColumnsOf({ description: true, value: false })).toEqual(['key', 'description']);
    });
});

describe('the bulk text of a key-value table', () => {
    it('says one pair per line, the disabled ones commented out', () => {
        const text = bulkTextOf([
            line('0', 'start', '2024-07-16'),
            line('1', 'end', '2024-08-16', { disabled: true }),
        ]);

        expect(text).toBe('start:2024-07-16\n//end:2024-08-16');
    });

    it('reads the text back, keeping what each named line already was', () => {
        const previous = [
            line('0', 'start', '2024-07-16', {
                description: 'Fecha de inicio',
                meta: { type: 'string' as const },
            }),
            line('1', 'end', '2024-08-16'),
        ];
        const read = linesOfBulk('start:2024-07-20\n//start-old:x\nnuevo:1', previous);

        expect(read).toHaveLength(3);
        expect(read.map((each) => each.id)).toEqual(['0', '2', '3']);
        expect(read[0]).toMatchObject({
            description: 'Fecha de inicio',
            disabled: false,
            id: '0',
            meta: { type: 'string' },
            name: 'start',
            value: '2024-07-20',
        });
        expect(read[1]).toMatchObject({ disabled: true, name: 'start-old' });
    });

    it('turns the comment into the switch: a commented line comes back disabled', () => {
        const read = linesOfBulk('//a:1\nb:2', [line('0', 'a', '1'), line('1', 'b', '2')]);

        expect(read[0]?.disabled).toBe(true);
        expect(read[1]?.disabled).toBe(false);
    });

    it('skips the blank lines and keeps a line without colon as a bare key', () => {
        const read = linesOfBulk('a:1\n\nsola', []);

        expect(read).toHaveLength(2);
        expect(read[1]).toMatchObject({ name: 'sola', value: '' });
    });
});
