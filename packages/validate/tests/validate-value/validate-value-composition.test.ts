import { describe, expect, it } from 'vitest';

import { issuesOf, type Refused } from '../support/issues-of.js';

const TEXT_OR_WHOLE = [{ type: 'string' }, { type: 'integer' }];

const REFUSED: Refused[] = [
    {
        name: 'a value matching no schema of anyOf',
        schema: { anyOf: TEXT_OR_WHOLE },
        value: 1.5,
        issue: { keyword: 'anyOf', schemaPath: '/anyOf', message: 'must match a schema in anyOf' },
    },
    {
        name: 'a value matching no schema of oneOf',
        schema: { oneOf: TEXT_OR_WHOLE },
        value: 1.5,
        issue: {
            keyword: 'oneOf',
            schemaPath: '/oneOf',
            message: 'must match exactly one schema in oneOf',
        },
    },
    {
        name: 'a value matching two schemas of oneOf',
        schema: { oneOf: [{ type: 'number' }, { type: 'integer' }] },
        value: 1,
        issue: { keyword: 'oneOf', schemaPath: '/oneOf' },
    },
    {
        name: 'a value matching the schema of not',
        schema: { not: { type: 'string' } },
        value: 'x',
        issue: { keyword: 'not', schemaPath: '/not', message: 'must NOT be valid against not' },
    },
    {
        name: 'a value behind a reference nobody can resolve',
        schema: { $ref: 'https://example.com/x.json' },
        value: 1,
        issue: {
            keyword: '$ref',
            params: { ref: 'https://example.com/x.json' },
            schemaPath: '/$ref',
            message: 'cannot resolve the reference https://example.com/x.json',
        },
    },
];

describe('the rules that compose schemas', () => {
    it.each(REFUSED)('refuses $name', ({ schema, value, issue }) => {
        expect(issuesOf(schema, value)).toEqual([expect.objectContaining(issue)]);
    });

    it('checks the branch a condition picks, and places the rule inside it', () => {
        const schema = {
            if: { properties: { kind: { const: 'card' } } },
            then: { required: ['number'] },
            else: { required: ['iban'] },
        };

        expect(issuesOf(schema, { kind: 'card' })).toEqual([
            expect.objectContaining({
                params: { property: 'number' },
                schemaPath: '/then/required/0',
            }),
        ]);
        expect(issuesOf(schema, { kind: 'bank' })).toEqual([
            expect.objectContaining({
                params: { property: 'iban' },
                schemaPath: '/else/required/0',
            }),
        ]);
    });

    it('applies the schema a key brings with it', () => {
        const schema = { dependentSchemas: { card: { required: ['cvc'] } } };

        expect(issuesOf(schema, { card: 1 })).toEqual([
            expect.objectContaining({
                keyword: 'required',
                schemaPath: '/dependentSchemas/card/required/0',
            }),
        ]);
    });

    it('follows a reference into its definition and places the rule there', () => {
        const schema = {
            properties: { owner: { $ref: '#/$defs/user' } },
            $defs: { user: { properties: { name: { type: 'string' } } } },
        };

        expect(issuesOf(schema, { owner: { name: 1 } })).toEqual([
            expect.objectContaining({
                path: '/owner/name',
                schemaPath: '/$defs/user/properties/name/type',
            }),
        ]);
    });

    it('places a rule of a definition the root refers to', () => {
        const schema = { $ref: '#/$defs/text', $defs: { text: { type: 'string' } } };

        expect(issuesOf(schema, 1)).toEqual([
            expect.objectContaining({ keyword: 'type', schemaPath: '/$defs/text/type' }),
        ]);
    });
});
