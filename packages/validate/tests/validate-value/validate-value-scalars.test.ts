import { describe, expect, it } from 'vitest';

import { issuesOf, type Refused } from '../support/issues-of.js';

/** Each bound refusing 4, the number every row checks. */
const BOUNDS: Refused[] = [
    {
        name: 'a number under the minimum',
        schema: { minimum: 5 },
        value: 4,
        issue: { keyword: 'minimum', params: { limit: '5', actual: '4' }, message: 'must be >= 5' },
    },
    {
        name: 'a number over the maximum',
        schema: { maximum: 1 },
        value: 4,
        issue: { keyword: 'maximum', params: { limit: '1', actual: '4' }, message: 'must be <= 1' },
    },
    {
        name: 'a number at an exclusive minimum',
        schema: { exclusiveMinimum: 4 },
        value: 4,
        issue: {
            keyword: 'exclusiveMinimum',
            params: { limit: '4', actual: '4' },
            message: 'must be > 4',
        },
    },
    {
        name: 'a number at an exclusive maximum',
        schema: { exclusiveMaximum: 4 },
        value: 4,
        issue: {
            keyword: 'exclusiveMaximum',
            params: { limit: '4', actual: '4' },
            message: 'must be < 4',
        },
    },
    {
        name: 'a number that is no multiple',
        schema: { multipleOf: 3 },
        value: 4,
        issue: {
            keyword: 'multipleOf',
            params: { limit: '3', actual: '4' },
            message: 'must be a multiple of 3',
        },
    },
];

/** Each rule refusing the string `ab`. */
const STRINGS: Refused[] = [
    {
        name: 'a string too short',
        schema: { minLength: 3 },
        value: 'ab',
        issue: {
            keyword: 'minLength',
            params: { limit: '3', actual: '2' },
            message: 'must NOT have fewer than 3 characters',
        },
    },
    {
        name: 'a string too long',
        schema: { maxLength: 1 },
        value: 'ab',
        issue: {
            keyword: 'maxLength',
            params: { limit: '1', actual: '2' },
            message: 'must NOT have more than 1 characters',
        },
    },
    {
        name: 'a string off the pattern',
        schema: { pattern: '^z' },
        value: 'ab',
        issue: {
            keyword: 'pattern',
            params: { pattern: '^z', actual: 'ab' },
            message: 'must match pattern "^z"',
        },
    },
    {
        name: 'a value that is none of the allowed',
        schema: { enum: ['a', 1] },
        value: 'ab',
        issue: {
            keyword: 'enum',
            params: { allowed: 'a, 1' },
            message: 'must be equal to one of the allowed values',
        },
    },
    {
        name: 'a value that is not the constant',
        schema: { const: 'k' },
        value: 'ab',
        issue: {
            keyword: 'const',
            params: { expected: '"k"' },
            message: 'must be equal to constant',
        },
    },
];

describe('the rules of numbers, strings and values', () => {
    it.each([...BOUNDS, ...STRINGS])('refuses $name', ({ schema, value, issue }) => {
        expect(issuesOf(schema, value)).toEqual([expect.objectContaining(issue)]);
    });
});
