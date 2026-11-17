import { describe, expect, it } from 'vitest';

import {
    postmanCollectionSchema,
    postmanItemSchema,
} from '../../../src/postman/document/postman-collection-schema.js';

const info = { name: 'c', schema: 'https://x/collection/v2.1.0/collection.json' };

describe('postmanCollectionSchema', () => {
    it('reads a collection with a nested folder and keeps the keys it does not name', () => {
        const read = postmanCollectionSchema.parse({
            info,
            item: [{ name: 'a', item: [{ name: 'b', item: [] }], extra: 1 }],
            custom: true,
        });

        expect(read.item[0]?.item?.[0]?.name).toBe('b');
        expect(read.item[0]?.['extra']).toBe(1);
        expect(read['custom']).toBe(true);
    });

    it('turns a request written as text into a request with that url', () => {
        const read = postmanItemSchema.parse({ name: 'a', request: 'https://x.test/a' });

        expect(read.request).toEqual({ url: { raw: 'https://x.test/a' } });
    });

    it('turns a url written as text into an object with it as raw', () => {
        const read = postmanItemSchema.parse({ request: { method: 'GET', url: 'https://x.test' } });

        expect(read.request).toMatchObject({ url: { raw: 'https://x.test' } });
    });

    /** Postman writes headers as text in `Name: value` lines too; a line with no name is no header. */
    it('turns headers written as text into rows, for a request and for an example', () => {
        const header =
            'Content-Type: application/json\r\nX-A: 1:2\n\nnot a header\n: no name\n  : blank name';
        const read = postmanItemSchema.parse({
            request: { url: 'h', header },
            response: [{ code: 200, header }],
        });
        const rows = [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'X-A', value: '1:2' },
        ];

        expect(read.request).toMatchObject({ header: rows });
        expect(read.response?.[0]?.header).toEqual(rows);
    });

    it('reads a description as text or as an object, and the nulls a file leaves', () => {
        const read = postmanItemSchema.parse({
            description: { content: 'a', type: 'text/markdown' },
            auth: null,
            event: null,
            response: null,
            request: { description: 'b', body: null, auth: null, url: null },
        });

        expect(read.description).toEqual({ content: 'a', type: 'text/markdown' });
    });

    it('refuses a collection with no info or with items that are not a list', () => {
        expect(postmanCollectionSchema.safeParse({ item: [] }).success).toBe(false);
        expect(postmanCollectionSchema.safeParse({ info, item: 'x' }).success).toBe(false);
    });
});
