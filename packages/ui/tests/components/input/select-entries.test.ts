import { describe, expect, it } from 'vitest';

import { chosenOf, isOptionGroup } from '../../../src/components/input/select-entries.js';

const ENTRIES = [
    { label: 'GET', value: 'get' },
    { label: 'Others', options: [{ label: 'PATCH', value: 'patch' }] },
] as const;

describe('the entries of a list', () => {
    it('tells a group of options from one option', () => {
        expect(ENTRIES.map((entry) => isOptionGroup(entry))).toEqual([false, true]);
    });

    it('answers the value chosen as the caller typed it, inside a group too', () => {
        expect(chosenOf(ENTRIES, 'get')).toBe('get');
        expect(chosenOf(ENTRIES, 'patch')).toBe('patch');
        expect(chosenOf(ENTRIES, 'put')).toBeUndefined();
    });
});
