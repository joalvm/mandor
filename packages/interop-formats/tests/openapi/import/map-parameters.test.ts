import { describe, expect, it } from 'vitest';

import { parametersOf } from '../../../src/openapi/import/map-parameters.js';

function one(parameter: Record<string, unknown>) {
    return parametersOf({}, { parameters: [parameter] })[0];
}

describe('the parameters of an operation', () => {
    it('starts a parameter with the value the document gives it, the most specific first', () => {
        const schema = { default: 'fromDefault', example: 'fromSchemaExample' };

        expect(one({ name: 'a', in: 'query', example: 2, schema })?.value).toBe('2');
        expect(
            one({ name: 'a', in: 'query', examples: { first: { value: 'x' } }, schema })?.value,
        ).toBe('x');
        expect(one({ name: 'a', in: 'query', schema })?.value).toBe('fromDefault');
        expect(one({ name: 'a', in: 'query', schema: { example: 'e' } })?.value).toBe('e');
        expect(one({ name: 'a', in: 'query' })?.value).toBe('');
    });

    it('tells a structured example as the text it is', () => {
        expect(one({ name: 'a', in: 'query', example: { k: 1 } })?.value).toBe('{\n  "k": 1\n}');
    });

    it('asks for what the document requires, and always for a path parameter', () => {
        expect(one({ name: 'a', in: 'query', required: true })?.required).toBe(true);
        expect(one({ name: 'a', in: 'query' })?.required).toBe(false);
        expect(one({ name: 'id', in: 'path' })?.required).toBe(true);
    });

    it('keeps the contract of the parameter as the text of its schema', () => {
        expect(one({ name: 'a', in: 'query', schema: { type: 'integer' } })?.schema).toBe(
            '{"type":"integer"}',
        );
        expect(one({ name: 'a', in: 'query' })?.schema).toBeUndefined();
    });

    it('lets the operation win over the path item by name and place, keeping the order', () => {
        const parameters = parametersOf(
            {
                parameters: [
                    { name: 'limit', in: 'query', example: 10 },
                    { name: 'limit', in: 'header', example: 'h' },
                ],
            },
            {
                parameters: [
                    { name: 'limit', in: 'query', example: 50 },
                    { name: 'page', in: 'query' },
                ],
            },
        );

        expect(
            parameters.map((parameter) => `${parameter.in}:${parameter.name}=${parameter.value}`),
        ).toEqual(['query:limit=50', 'header:limit=h', 'query:page=']);
    });

    it('leaves out what it cannot place: no name, or a place the item has no row for', () => {
        expect(
            parametersOf({}, { parameters: [{ in: 'query' }, { name: 'a', in: 'body' }, 'text'] }),
        ).toEqual([]);
        expect(one({ name: 'session', in: 'cookie' })?.in).toBe('cookie');
    });

    it('is empty when there is nothing to say', () => {
        expect(parametersOf({}, {})).toEqual([]);
    });
});
