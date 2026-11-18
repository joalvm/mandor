import { describe, expect, it } from 'vitest';

import { firstViolation } from '../../../../../../src/renderer/features/requests/lib/compare/first-violation.js';
import { httpResponseWith, textBody } from '../../../../../unit-dom/support/http-response.js';

const SCHEMA = JSON.stringify({
    properties: { data: { properties: { expire: { type: 'number' } }, type: 'object' } },
    type: 'object',
});

function answer(body: string) {
    return httpResponseWith({ body: textBody(body) });
}

describe('the first rule an answer still breaks (firstViolation)', () => {
    it('hands the rule over with the dotted path of the value', () => {
        expect(firstViolation(SCHEMA, answer('{"data":{"expire":"soon"}}'))).toMatchObject({
            path: 'data.expire',
            rule: { keyword: 'type', path: '/data/expire' },
        });
    });

    it('names the root as $', () => {
        const required = JSON.stringify({ required: ['id'], type: 'object' });

        expect(firstViolation(required, answer('{}'))).toMatchObject({
            path: '$',
            rule: { keyword: 'required', params: { property: 'id' } },
        });
    });

    it('finds nothing when the answer keeps the schema, or there is no schema', () => {
        expect(firstViolation(SCHEMA, answer('{"data":{"expire":3}}'))).toBeUndefined();
        expect(firstViolation(undefined, answer('{}'))).toBeUndefined();
    });
});
