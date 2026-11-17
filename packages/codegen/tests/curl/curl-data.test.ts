import { describe, expect, it } from 'vitest';

import { dataPieceOf } from '../../src/curl/curl-data.js';
import type { DataPart } from '../../src/curl/curl-body-part.js';

function part(kind: DataPart['kind'], value: string): DataPart {
    return { flag: '-d', kind, value };
}

describe('a piece of the body a curl names', () => {
    it.each(['data', 'binary'] as const)('reads %s as text, or as a file after an @', (kind) => {
        expect(dataPieceOf(part(kind, 'a=1'))).toEqual({ kind: 'text', text: 'a=1', json: false });
        expect(dataPieceOf(part(kind, '@body.json'))).toEqual({
            kind: 'file',
            path: 'body.json',
            json: false,
        });
    });

    it('reads --json as text that is json, and as a file after an @', () => {
        expect(dataPieceOf(part('json', '{"a":1}'))).toEqual({
            kind: 'text',
            text: '{"a":1}',
            json: true,
        });
        expect(dataPieceOf(part('json', '@a.json'))).toEqual({
            kind: 'file',
            path: 'a.json',
            json: true,
        });
    });

    it('reads --data-raw as it is, an @ included', () => {
        expect(dataPieceOf(part('raw', '@x'))).toEqual({ kind: 'text', text: '@x', json: false });
    });

    it.each([
        ['content', 'a b {{x}}', 'a%20b%20{{x}}'],
        ['=content', '=a&b', 'a%26b'],
        ['name=content', 'q=a b {{x}}', 'q=a%20b%20{{x}}'],
        ['name=content with an @', 'q=a@b', 'q=a%40b'],
    ])('encodes the content of a urlencode part: %s', (_shape, value, expected) => {
        expect(dataPieceOf(part('urlencode', value))).toEqual({
            kind: 'text',
            text: expected,
            json: false,
        });
    });

    it.each([
        ['@a.txt', 'a.txt'],
        ['name@a.txt', 'a.txt'],
    ])('reads %s of a urlencode part as a file', (value, path) => {
        expect(dataPieceOf(part('urlencode', value))).toEqual({ kind: 'file', path, json: false });
    });
});
