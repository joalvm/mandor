import { describe, expect, it } from 'vitest';

import { nextLineId, withNewLine } from '../src/lib/entry-line.js';

describe('nextLineId', () => {
    it('counts one past the highest numeric id, skipping the ones that are not numbers', () => {
        expect(nextLineId([{ id: '0' }, { id: '2' }, { id: 'x' }])).toBe('3');
        expect(nextLineId([])).toBe('0');
    });
});

describe('withNewLine', () => {
    it('adds one empty line under an identity none of the others holds', () => {
        const lines = withNewLine([
            { disabled: false, id: '0', name: 'Authorization', value: 'token' },
        ]);

        expect(lines).toHaveLength(2);
        expect(lines[1]).toEqual({ disabled: false, id: '1', name: '', value: '' });
    });

    it('counts past the lines that carry no number as an identity', () => {
        const lines = withNewLine([
            { disabled: false, id: '7', name: 'a', value: 'b' },
            { disabled: true, id: 'mensaje', name: 'c', value: 'd' },
        ]);

        expect(lines[2]?.id).toBe('8');
    });

    it('starts at zero on an empty list', () => {
        expect(withNewLine([])).toEqual([{ disabled: false, id: '0', name: '', value: '' }]);
    });
});
