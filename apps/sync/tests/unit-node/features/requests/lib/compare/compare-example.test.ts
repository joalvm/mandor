import { describe, expect, it } from 'vitest';

import {
    compareExample,
    violationsAgainst,
} from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { httpResponseWith, textBody } from '../../../../../unit-dom/support/http-response.js';

const EXAMPLE = {
    body: '{"id":1,"token":"a"}',
    contentType: 'application/json',
    name: '200 OK',
    status: '200',
};

describe('an example against a response (compare-example)', () => {
    it('counts nothing when the status and the body agree', () => {
        const response = httpResponseWith({ body: textBody('{"id":1,"token":"a"}'), status: 200 });
        const result = compareExample(EXAMPLE, response);

        expect(result.count).toBe(0);
        expect(result.valuesDiffer).toBe(false);
        expect(result.statusDiffers).toBe(false);
        expect(result.quiet).toBe(true);
        expect(result.received).toBe(response);
    });

    it('counts a declared header that did not come, and offers one that came otherwise', () => {
        const example = {
            ...EXAMPLE,
            headers: [
                ['x-gone', '1'],
                ['x-kept', 'old'],
            ] as [string, string][],
        };
        const response = httpResponseWith({
            body: textBody(EXAMPLE.body),
            headers: [['x-kept', 'new']],
            status: 200,
        });
        const result = compareExample(example, response);

        expect(result.facts.map((fact) => fact.name)).toEqual(['x-gone', 'x-kept']);
        expect(result.count).toBe(1);
        expect(result.changes).toBe(1);
        expect(result.quiet).toBe(false);
        expect(result.valuesDiffer).toBe(true);
    });

    it('adds the status to the differences of the shape of the body', () => {
        const response = httpResponseWith({
            body: textBody('{"id":"2","token":"a"}'),
            status: 404,
        });
        const result = compareExample(EXAMPLE, response);

        expect(result.statusDiffers).toBe(true);
        expect(result.count).toBe(2);
        expect(result.valuesDiffer).toBe(true);
    });

    it('offers other content as a change to take, but counts it as no difference', () => {
        const response = httpResponseWith({ body: textBody('{"id":2,"token":"b"}'), status: 200 });
        const result = compareExample(EXAMPLE, response);

        expect(result.count).toBe(0);
        expect(result.changes).toBe(2);
        expect(result.valuesDiffer).toBe(true);
        expect(result.quiet).toBe(false);
    });

    it('compares against an empty text a body that did not come as text', () => {
        const response = httpResponseWith({ status: 200 });

        expect(compareExample({ ...EXAMPLE, body: '' }, response).quiet).toBe(true);
        expect(compareExample(EXAMPLE, response)).toMatchObject({ changes: 1, count: 0 });
    });

    describe('with the schema of its status', () => {
        const SCHEMA = JSON.stringify({
            properties: { id: { type: 'number' }, token: { type: 'number' } },
            type: 'object',
        });

        it('carries the rules the schema refuses, and says where each one is', () => {
            const response = httpResponseWith({
                body: textBody('{"id":1,"token":"a"}'),
                status: 200,
            });
            const result = compareExample(EXAMPLE, response, SCHEMA);

            expect(result.violations).toEqual([
                expect.objectContaining({ path: '/token', schemaPath: '/properties/token/type' }),
            ]);
        });

        it('counts no difference when only the schema complains: the example is the answer', () => {
            const response = httpResponseWith({
                body: textBody('{"id":1,"token":"a"}'),
                status: 200,
            });
            const result = compareExample(EXAMPLE, response, SCHEMA);

            expect(result.count).toBe(0);
            expect(result.valuesDiffer).toBe(false);
            expect(result.statusDiffers).toBe(false);
            expect(result.quiet).toBe(true);
        });

        it('answers why a schema that cannot be read is no schema', () => {
            const response = httpResponseWith({
                body: textBody('{"id":1,"token":"a"}'),
                status: 200,
            });
            const result = compareExample(EXAMPLE, response, '{"type":');

            expect(result.schemaError).toEqual(expect.any(String));
            expect(result.violations).toEqual([]);
            expect(result.count).toBe(0);
        });

        it('has no error and no violation without a schema', () => {
            const response = httpResponseWith({
                body: textBody('{"id":1,"token":"a"}'),
                status: 200,
            });
            const result = compareExample(EXAMPLE, response);

            expect(result).not.toHaveProperty('schemaError');
            expect(result.violations).toEqual([]);
        });
    });

    it('tells the rules broken under a schema only when the answer was set against it', () => {
        const schema = '{"properties": {"id": {"type": "string"}}}';
        const response = httpResponseWith({ body: textBody('{"id":1}'), status: 200 });
        const result = compareExample(EXAMPLE, response, schema);

        expect(violationsAgainst(result, schema)).toHaveLength(1);
        expect(violationsAgainst(result, '{"type": "object"}')).toEqual([]);
        expect(violationsAgainst(undefined, schema)).toEqual([]);
    });
});
