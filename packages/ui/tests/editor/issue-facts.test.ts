import { describe, expect, it } from 'vitest';

import { issueFactsIn } from '../../src/editor/issue-facts.js';

const SCHEMA = [
    '{',
    '    "properties": {',
    '        "expire": { "type": "string" },',
    '        "price": { "minimum": 0 },',
    '        "kind": { "enum": ["a", "b"] }',
    '    },',
    '    "required": ["id"]',
    '}',
].join('\n');

const VALUE = '{ "expire": 1735689600, "price": -5, "kind": "c" }';

describe('what a row of the dock tells beyond its message', () => {
    it('sets what the rule asked against what came, with the value that came', () => {
        const factsOf = issueFactsIn(SCHEMA, VALUE);

        expect(
            factsOf({
                keyword: 'type',
                params: { expected: 'string', received: 'integer' },
                path: '/expire',
                schemaPath: '/properties/expire/type',
            }),
        ).toEqual({
            line: 3,
            pair: { expected: 'string', received: 'integer', value: '1735689600' },
        });
    });

    it('leaves the value out when it is what came already', () => {
        const factsOf = issueFactsIn(SCHEMA, VALUE);

        expect(
            factsOf({
                keyword: 'minimum',
                params: { actual: '-5', limit: '0' },
                path: '/price',
                schemaPath: '/properties/price/minimum',
            }).pair,
        ).toEqual({ expected: '≥ 0', received: '-5', value: undefined });
    });

    it('takes what came from the value when the rule cannot say it', () => {
        const factsOf = issueFactsIn(SCHEMA, VALUE);

        expect(
            factsOf({
                keyword: 'enum',
                params: { allowed: '"a", "b"' },
                path: '/kind',
                schemaPath: '/properties/kind/enum',
            }).pair,
        ).toEqual({ expected: '"a", "b"', received: '"c"', value: undefined });
    });

    it('keeps only the line of a rule with no two halves, or of a value it cannot read', () => {
        const factsOf = issueFactsIn(SCHEMA, VALUE);
        const unread = issueFactsIn(SCHEMA, undefined);
        const kind = {
            keyword: 'enum',
            params: { allowed: '"a", "b"' },
            path: '/kind',
            schemaPath: '/properties/kind/enum',
        };

        expect(
            factsOf({
                keyword: 'required',
                params: { property: 'id' },
                path: '',
                schemaPath: '/required',
            }),
        ).toEqual({ line: 7, pair: undefined });
        expect(unread(kind)).toEqual({ line: 5, pair: undefined });
    });
});
