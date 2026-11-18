import { describe, expect, it } from 'vitest';

import { curlUrl, isAddress, urlQueryRows } from '../../src/curl/curl-url.js';

describe('the URL of a curl command', () => {
    it('adds http when the scheme is missing, as curl does', () => {
        expect(curlUrl('example.test/a').url).toBe('http://example.test/a');
        expect(curlUrl('localhost:3000/a').url).toBe('http://localhost:3000/a');
    });

    it('keeps a scheme it was given and a placeholder at the start', () => {
        expect(curlUrl('HTTPS://h/a').url).toBe('HTTPS://h/a');
        expect(curlUrl('{{baseUrl}}/a').url).toBe('{{baseUrl}}/a');
    });

    it('moves the query to rows, in order, and drops the fragment', () => {
        expect(curlUrl('example.test/a?x=1&y=2#f')).toEqual({
            url: 'http://example.test/a',
            query: [
                { key: 'x', value: '1', enabled: true },
                { key: 'y', value: '2', enabled: true },
            ],
        });
    });

    it('decodes the query and keeps the placeholders and repeated keys', () => {
        expect(curlUrl('{{baseUrl}}/a?q=a%20b&t={{x}}&t=2').query).toEqual([
            { key: 'q', value: 'a b', enabled: true },
            { key: 't', value: '{{x}}', enabled: true },
            { key: 't', value: '2', enabled: true },
        ]);
    });

    it('drops the fragment of a URL with no query', () => {
        expect(curlUrl('https://h/a#frag')).toEqual({ url: 'https://h/a', query: [] });
    });

    it('does not read a question mark of the fragment as a query', () => {
        expect(curlUrl('https://h/a#f?x=1')).toEqual({ url: 'https://h/a', query: [] });
    });

    it('has no rows for an empty query', () => {
        expect(curlUrl('https://h/a?')).toEqual({ url: 'https://h/a', query: [] });
    });

    it.each([
        ['an escaped ampersand', 'https://h/a?x=1\\&y=2'],
        ['escaped signs everywhere', 'https:\\/\\/h\\/a\\?x\\=1\\&y\\=2'],
        ['a line cut by a backslash', 'https://h/a?\\\nx=1&\\\r\n  y=2'],
        ['a bare line break', 'https://h/a?\nx=1&\n  y=2'],
        ['spaces around', '  https://h/a?x=1&y=2 '],
        ['the quotes of a JSON string', '"https://h/a?x=1&y=2"'],
        ['an escaped fragment', 'https://h/a?x=1&y=2\\#f'],
    ])('is clean after %s', (_name, raw) => {
        expect(curlUrl(raw)).toEqual({
            url: 'https://h/a',
            query: [
                { key: 'x', value: '1', enabled: true },
                { key: 'y', value: '2', enabled: true },
            ],
        });
    });

    it('reads the escaped brackets of a globbed URL, and trims a key', () => {
        expect(curlUrl('https://h?f\\[id\\]=1& g=2').query).toEqual([
            { key: 'f[id]', value: '1', enabled: true },
            { key: 'g', value: '2', enabled: true },
        ]);
    });

    it('keeps a backslash that is text of a value', () => {
        expect(curlUrl('https://h?p=C:\\temp').query).toEqual([
            { key: 'p', value: 'C:\\temp', enabled: true },
        ]);
    });

    it.each([
        ['https://ana:p%40ss@h/a', 'https://h/a', { username: 'ana', password: 'p@ss' }],
        ['https://ana@h/a', 'https://h/a', { username: 'ana', password: '' }],
        ['https://ana:a:b@h', 'https://h', { username: 'ana', password: 'a:b' }],
        ['ana:p@h/a', 'http://h/a', { username: 'ana', password: 'p' }],
        ['https://ana:%zz@h', 'https://h', { username: 'ana', password: '%zz' }],
        ['https://{{u}}:{{p}}@h', 'https://h', { username: '{{u}}', password: '{{p}}' }],
    ])('takes the user out of %s', (raw, url, user) => {
        expect(curlUrl(raw)).toEqual({ url, query: [], user });
    });

    it('does not take an at sign of the path or the query for a user', () => {
        expect(curlUrl('https://h/a@b?c=d@e')).toEqual({
            url: 'https://h/a@b',
            query: [{ key: 'c', value: 'd@e', enabled: true }],
        });
    });
});

describe('a word that says where to go', () => {
    it.each(['https://h', 'HTTP://h', 'https:\\/\\/h', '"https://h"', '{{base}}/a'])(
        'is %j',
        (word) => {
            expect(isAddress(word)).toBe(true);
        },
    );

    it.each(['abc', 'h.test/a', ''])('is not %j', (word) => {
        expect(isAddress(word)).toBe(false);
    });
});

describe('the params of --url-query', () => {
    function arg(value: string | null, name = 'url-query') {
        return { name, flag: `--${name}`, value };
    }

    it('reads a name and a value, a bare name, and the plus that asks for no encoding', () => {
        expect(urlQueryRows([arg('a=b c'), arg('d'), arg('+e=f=g')])).toEqual([
            { key: 'a', value: 'b c', enabled: true },
            { key: 'd', value: '', enabled: true },
            { key: 'e', value: 'f=g', enabled: true },
        ]);
    });

    it('takes nothing from another option', () => {
        expect(urlQueryRows([arg('a=b', 'header'), arg(null)])).toEqual([]);
    });
});
