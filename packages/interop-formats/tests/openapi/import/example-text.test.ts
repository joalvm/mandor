import { describe, expect, it } from 'vitest';

import { exampleText } from '../../../src/openapi/import/example-text.js';

describe('the text an example travels as', () => {
    it.each([
        ['an object in JSON', { id: 1 }, 'application/json', '{\n  "id": 1\n}'],
        ['a string in JSON', '{{token}}', 'application/json', '{{token}}'],
        ['a number in plain text', 5, 'text/plain', '5'],
        [
            'an object in urlencoded',
            { a: 1 },
            'application/x-www-form-urlencoded',
            '{\n  "a": 1\n}',
        ],
        ['a list in a +json type', [1], 'application/problem+json', '[\n  1\n]'],
        ['an object in XML', { a: 1 }, 'application/xml', '{\n  "a": 1\n}'],
        ['a number in JSON', 5, 'application/json', '5'],
        ['a boolean with no content type', true, null, 'true'],
        ['a string with no content type', 'abc', null, 'abc'],
        ['nothing at all', undefined, 'application/json', ''],
    ])('tells %s', (_name, value, _contentType, expected) => {
        expect(exampleText(value)).toBe(expected);
    });
});
