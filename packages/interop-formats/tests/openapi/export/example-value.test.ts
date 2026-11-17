import { describe, expect, it } from 'vitest';

import { exampleValue } from '../../../src/openapi/export/example-value.js';

describe('the value an example travels as, read the other way', () => {
    it.each([['application/json'], ['application/x-www-form-urlencoded'], ['multipart/form-data']])(
        'parses the structured text of %s',
        (contentType) => {
            expect(exampleValue('{\n  "a": 1\n}', contentType)).toEqual({ a: 1 });
            expect(exampleValue('{"a":1}', contentType)).toEqual({ a: 1 });
        },
    );

    it('keeps a text that parses to a text as written', () => {
        expect(exampleValue('"texto"', 'application/json')).toBe('"texto"');
    });

    it('keeps the text that no JSON parses as written', () => {
        expect(exampleValue('sin json', 'application/json')).toBe('sin json');
    });

    it('keeps the plain text of every other content type as written', () => {
        expect(exampleValue('hola', 'text/plain')).toBe('hola');
        expect(exampleValue('{"a":1}', 'text/plain')).toBe('{"a":1}');
    });

    it.each(['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'])(
        'answers the text back from %s, for the samples the import normalizes',
        (contentType) => {
            const texts = ['{\n  "a": 1\n}', '[\n  1,\n  2\n]', '"texto"', 'sin json', '', '10'];

            for (const text of texts) {
                const value = exampleValue(text, contentType);
                const back = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

                expect(back).toBe(text);
            }
        },
    );
});
