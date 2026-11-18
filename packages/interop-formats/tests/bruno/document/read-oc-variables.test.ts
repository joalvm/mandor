import { describe, expect, it } from 'vitest';

import {
    environmentFrom,
    valueTextOf,
    variablesFrom,
} from '../../../src/bruno/document/read-oc-variables.js';

describe('valueTextOf', () => {
    it('reads a text, a number or a flag as its text', () => {
        expect(valueTextOf('x')).toBe('x');
        expect(valueTextOf(3)).toBe('3');
        expect(valueTextOf(true)).toBe('true');
    });

    it('reads the data of a typed value', () => {
        expect(valueTextOf({ type: 'string', data: 'x' })).toBe('x');
        expect(valueTextOf({ type: 'string' })).toBe('');
    });

    it('reads the variant marked as selected from a list, or the first', () => {
        expect(
            valueTextOf([{ value: 'a' }, { selected: true, value: { type: 'string', data: 'b' } }]),
        ).toBe('b');
        expect(valueTextOf([{ value: 'a' }, { value: 'b' }])).toBe('a');
    });

    it('reads nothing from an empty list, a list of no records, or no value', () => {
        expect(valueTextOf([])).toBe('');
        expect(valueTextOf(['x'])).toBe('');
        expect(valueTextOf(undefined)).toBe('');
        expect(valueTextOf(null)).toBe('');
    });
});

describe('variablesFrom', () => {
    it('lists the variables with their flags and drops the ones with no name', () => {
        expect(
            variablesFrom([
                { name: 'a', value: '1' },
                { name: 'b', disabled: true, secret: true },
                { value: 'x' },
                { name: '' },
            ]),
        ).toEqual([
            { name: 'a', value: '1', disabled: false, secret: false },
            { name: 'b', value: '', disabled: true, secret: true },
        ]);
    });

    it('lists nothing for a list that is absent', () => {
        expect(variablesFrom(undefined)).toEqual([]);
        expect(variablesFrom(null)).toEqual([]);
    });
});

describe('environmentFrom', () => {
    it('keeps the name the environment wrote', () => {
        expect(
            environmentFrom({ name: 'Prod', variables: [{ name: 'a', value: '1' }] }, 'x'),
        ).toEqual({
            name: 'Prod',
            variables: [{ name: 'a', value: '1', disabled: false, secret: false }],
        });
    });

    it('takes the fallback for one that wrote none', () => {
        expect(environmentFrom({}, 'Environment 1')).toEqual({
            name: 'Environment 1',
            variables: [],
        });
    });
});
