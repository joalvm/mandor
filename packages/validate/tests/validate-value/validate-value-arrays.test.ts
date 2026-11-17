import { describe, expect, it } from 'vitest';

import { issuesOf, type Refused } from '../support/issues-of.js';

const REFUSED: Refused[] = [
    {
        name: 'too few items',
        schema: { minItems: 3 },
        value: [1],
        issue: {
            keyword: 'minItems',
            params: { limit: '3', actual: '1' },
            message: 'must NOT have fewer than 3 items',
        },
    },
    {
        name: 'too many items',
        schema: { maxItems: 0 },
        value: [1],
        issue: {
            keyword: 'maxItems',
            params: { limit: '0', actual: '1' },
            message: 'must NOT have more than 0 items',
        },
    },
    {
        name: 'a repeated item',
        schema: { uniqueItems: true },
        value: [{ a: 1 }, { a: 1 }],
        issue: {
            path: '/1',
            keyword: 'uniqueItems',
            params: { duplicate: '/0' },
            message: 'must NOT have duplicate items (same as /0)',
        },
    },
    {
        name: 'an array with no matching item',
        schema: { contains: { type: 'string' } },
        value: [1],
        issue: {
            keyword: 'contains',
            params: {},
            schemaPath: '/contains',
            message: 'must contain a matching item',
        },
    },
    {
        name: 'too few matching items',
        schema: { contains: { type: 'string' }, minContains: 2 },
        value: ['a', 1],
        issue: {
            keyword: 'minContains',
            params: { limit: '2' },
            message: 'must contain at least 2 matching items',
        },
    },
    {
        name: 'too many matching items',
        schema: { contains: { type: 'string' }, maxContains: 1 },
        value: ['a', 'b'],
        issue: {
            keyword: 'maxContains',
            params: { limit: '1' },
            message: 'must contain at most 1 matching items',
        },
    },
    {
        name: 'an item past a closed tuple',
        schema: { prefixItems: [{}], items: false },
        value: [1, 2],
        issue: {
            keyword: 'items',
            schemaPath: '/items',
            message: 'must NOT have more items than the tuple',
        },
    },
    {
        name: 'an item past a closed tuple, as draft 2019 wrote it',
        schema: {
            $schema: 'https://json-schema.org/draft/2019-09/schema',
            items: [{}],
            additionalItems: false,
        },
        value: [1, 2],
        issue: {
            path: '/1',
            keyword: 'additionalItems',
            params: { index: '1' },
            message: 'must NOT have more items than the tuple',
        },
    },
    {
        name: 'an item no part of the schema evaluated',
        schema: { prefixItems: [{}], unevaluatedItems: false },
        value: [1, 2],
        issue: {
            path: '/1',
            keyword: 'unevaluatedItems',
            params: { index: '1' },
            message: 'must NOT have unevaluated items',
        },
    },
    {
        name: 'an item of the tuple of the wrong type',
        schema: { prefixItems: [{ type: 'string' }] },
        value: [1],
        issue: { path: '/0', schemaPath: '/prefixItems/0/type', message: 'must be string' },
    },
    {
        name: 'an item of the tuple of the wrong type, as draft 7 wrote it',
        schema: { $schema: 'http://json-schema.org/draft-07/schema#', items: [{ type: 'string' }] },
        value: [1],
        issue: { path: '/0', schemaPath: '/items/0/type' },
    },
];

describe('the rules of arrays', () => {
    it.each(REFUSED)('refuses $name', ({ schema, value, issue }) => {
        expect(issuesOf(schema, value)).toContainEqual(expect.objectContaining(issue));
    });
});
