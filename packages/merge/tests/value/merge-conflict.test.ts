import { describe, expect, it } from 'vitest';

import { conflictId, conflictOf, sideOf } from '../../src/value/merge-conflict.js';

describe('the shape of a conflict', () => {
    it('joins the path into an id that is the same every time', () => {
        expect(conflictId(['headers', 'Accept#0'])).toBe('headers/Accept#0');
        expect(conflictId(['headers', 'Accept#0'])).toBe(conflictId(['headers', 'Accept#0']));
        expect(conflictId([])).toBe('');
    });

    it('keeps «not there» apart from every value, falsy ones included', () => {
        expect(sideOf(undefined)).toBeNull();
        expect(sideOf(0)).toEqual({ value: 0 });
        expect(sideOf(null)).toEqual({ value: null });
    });

    it('builds a conflict from the three sides and a copy of the path', () => {
        const path = ['method'];
        const conflict = conflictOf('value', { base: 'GET', ours: 'PUT', theirs: undefined, path });

        path.push('changed');

        expect(conflict).toEqual({
            id: 'method',
            path: ['method'],
            shape: 'value',
            base: { value: 'GET' },
            ours: { value: 'PUT' },
            theirs: null,
        });
    });
});
