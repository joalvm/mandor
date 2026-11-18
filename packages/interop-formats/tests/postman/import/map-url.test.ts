import { describe, expect, it } from 'vitest';

import { urlOf } from '../../../src/postman/import/map-url.js';

describe('urlOf', () => {
    it('splits the query and the hash off, and turns :id into {id} with its value', () => {
        const parts = urlOf({
            raw: '{{base}}/users/:id?verbose=true#top',
            query: [{ key: 'verbose', value: 'true' }],
            variable: [{ key: 'id', value: '7' }],
        });

        expect(parts).toEqual({
            url: '{{base}}/users/{id}',
            hash: 'top',
            parameters: [
                { name: 'id', in: 'path', required: true, enabled: true, value: '7' },
                { name: 'verbose', in: 'query', required: false, enabled: true, value: 'true' },
            ],
        });
    });

    it('builds the address from its parts when there is no raw text', () => {
        const parts = urlOf({
            protocol: 'https',
            host: ['api', 'example', 'com'],
            port: 8443,
            path: ['v1', ':id'],
        });

        expect(parts.url).toBe('https://api.example.com:8443/v1/{id}');
        expect(parts.parameters).toEqual([
            { name: 'id', in: 'path', required: true, enabled: true, value: '' },
        ]);
    });

    it('builds an address from a host and a path written as text', () => {
        expect(urlOf({ host: 'example.com', path: 'a/b', port: '' }).url).toBe('example.com/a/b');
        expect(urlOf({ host: ['h'], port: null, path: null }).url).toBe('h');
    });

    it('does not take a port for a path variable', () => {
        const parts = urlOf({ raw: 'http://h:8080/x' });

        expect(parts).toEqual({ url: 'http://h:8080/x', parameters: [] });
    });

    it('asks for a path variable once, however many times the path names it', () => {
        const parts = urlOf({ raw: 'h/:a/x/:a' });

        expect(parts.url).toBe('h/{a}/x/{a}');
        expect(parts.parameters).toHaveLength(1);
    });

    it('keeps a disabled query row, and leaves out one with no key', () => {
        const parts = urlOf({
            raw: 'h?a=1',
            query: [
                { key: 'a', value: null, disabled: true },
                { key: null, value: 'x' },
                { key: '  ' },
                {},
            ],
        });

        expect(parts.parameters).toEqual([
            { name: 'a', in: 'query', required: false, enabled: false, value: '' },
        ]);
    });

    /** A url written as text has no rows: its query is read from the text, as Postman writes it. */
    it('reads the query from the text when the url has no rows, value and all', () => {
        const parts = urlOf({ raw: 'h/p?limit=10&flag&&empty=&a=b=c&q=a%20b#top' });

        expect(parts.parameters.map(({ name, value }) => [name, value])).toEqual([
            ['limit', '10'],
            ['flag', ''],
            ['empty', ''],
            ['a', 'b=c'],
            ['q', 'a%20b'],
        ]);
        expect(parts).toMatchObject({ url: 'h/p', hash: 'top' });
    });

    it('answers an empty address for no url at all', () => {
        expect(urlOf(undefined)).toEqual({ url: '', parameters: [] });
    });
});
