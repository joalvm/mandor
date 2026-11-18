import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parsedOf, row } from './parsed-of.js';

// The tests of `curl-request-of.ts` that read what other tools copy, as a file each.
function fixture(name: string): string {
    return readFileSync(new URL(`../fixtures/${name}.txt`, import.meta.url), 'utf8');
}

describe('the request the tools copy as curl', () => {
    it('reads what Chrome copies as cURL (bash), $-quoted body and cookie included', () => {
        expect(parsedOf(fixture('chrome-bash'))).toEqual({
            kind: 'parsed',
            request: {
                method: 'POST',
                url: 'https://api.example.test/v1/items',
                query: [row('limit', '10'), row('sort', 'name')],
                headers: [
                    row('accept', 'application/json, text/plain, */*'),
                    row('accept-language', 'en-US,en;q=0.9'),
                    row('authorization', 'Bearer eyJhbGciOi.payload.sig'),
                    row('content-type', 'application/json'),
                    row('Cookie', 'session=abc123; theme=dark'),
                    row('user-agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
                ],
                body: {
                    type: 'json',
                    content: '{"title":"it\'s a \\"test\\"","note":"line1\\nline2"}',
                },
                settings: {},
            },
            notices: [],
        });
    });

    it('reads what Firefox copies, with a form body and its charset', () => {
        expect(parsedOf(fixture('firefox'))).toEqual({
            kind: 'parsed',
            request: {
                method: 'POST',
                url: 'https://shop.example.test/api/cart',
                query: [],
                headers: [
                    row(
                        'User-Agent',
                        'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
                    ),
                    row('Accept', '*/*'),
                    row('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8'),
                    row('Cookie', 'sid=f00ba4'),
                ],
                body: {
                    type: 'urlencoded',
                    fields: [row('sku', 'A-100'), row('qty', '2'), row('note', 'hello there')],
                },
                settings: {},
            },
            notices: [],
        });
    });

    it('reads what Postman exports, with --location as a setting', () => {
        expect(parsedOf(fixture('postman'))).toEqual({
            kind: 'parsed',
            request: {
                method: 'POST',
                url: 'https://api.example.test/users/42',
                query: [],
                headers: [
                    row('Content-Type', 'application/json'),
                    row('X-Request-Id', '{{requestId}}'),
                ],
                body: { type: 'json', content: '{\n    "name": "Ana",\n    "active": true\n}' },
                settings: { followRedirects: true },
            },
            notices: [],
        });
    });

    it('reads what Insomnia copies, with --request and --url', () => {
        expect(parsedOf(fixture('insomnia'))).toEqual({
            kind: 'parsed',
            request: {
                method: 'PUT',
                url: 'https://api.example.test/orders/7',
                query: [row('expand', 'lines')],
                headers: [
                    row('Content-Type', 'application/json'),
                    row('User-Agent', 'insomnia/10.0.0'),
                ],
                body: { type: 'json', content: '{"status":"shipped"}' },
                settings: {},
            },
            notices: [],
        });
    });

    it('turns the variables of a README into placeholders and keeps them', () => {
        expect(parsedOf(fixture('readme-env'))).toEqual({
            kind: 'parsed',
            request: {
                method: 'GET',
                url: '{{BASE_URL}}/v2/me',
                query: [],
                headers: [
                    row('Authorization', 'Bearer {{TOKEN}}'),
                    row('Accept', 'application/json'),
                ],
                body: { type: 'none' },
                settings: { timeoutMs: 10000, validateTls: false },
                auth: { type: 'basic', username: 'admin', password: '{{ADMIN_PASSWORD}}' },
            },
            notices: [],
        });
    });
});
