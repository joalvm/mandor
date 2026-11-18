import { describe, expect, it } from 'vitest';

import { harRequestOf } from '../../src/snippet/har-request-of.js';
import type { SnippetRequest } from '../../src/snippet/snippet-request.js';

const base = {
    method: 'POST',
    url: 'https://api.example.test/items?x=1',
    httpVersion: 'HTTP/1.1',
    cookies: [],
    queryString: [],
    headersSize: -1,
    bodySize: -1,
};

function requestOf(body: SnippetRequest['body'], headers: [string, string][] = []) {
    return {
        method: 'POST',
        url: 'https://api.example.test/items?x=1',
        headers,
        body,
    };
}

describe('the HAR request a snippet is written from', () => {
    it('has an empty post data when there is no body', () => {
        expect(harRequestOf({ ...requestOf({ type: 'none' }), method: 'GET' })).toEqual({
            ...base,
            method: 'GET',
            headers: [],
            postData: { mimeType: '' },
        });
    });

    it('keeps the headers as they came, in order', () => {
        const { headers } = harRequestOf(
            requestOf({ type: 'none' }, [
                ['X-B', '2'],
                ['X-A', '1'],
            ]),
        );

        expect(headers).toEqual([
            { name: 'X-B', value: '2' },
            { name: 'X-A', value: '1' },
        ]);
    });

    it('writes a text body with its type, and adds the header it lacks', () => {
        expect(
            harRequestOf(requestOf({ type: 'text', contentType: 'application/json', text: '{}' })),
        ).toMatchObject({
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            postData: { mimeType: 'application/json', text: '{}' },
        });
    });

    it('does not add a Content-Type that is there, whatever its case', () => {
        const { headers } = harRequestOf(
            requestOf({ type: 'text', contentType: 'text/plain', text: 'a' }, [
                ['content-type', 'text/plain; charset=utf-8'],
            ]),
        );

        expect(headers).toEqual([{ name: 'content-type', value: 'text/plain; charset=utf-8' }]);
    });

    it('writes a urlencoded body as params with its type', () => {
        expect(
            harRequestOf(
                requestOf({
                    type: 'urlencoded',
                    fields: [
                        ['a', '1'],
                        ['b', 'x y'],
                    ],
                }),
            ),
        ).toMatchObject({
            headers: [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
            postData: {
                mimeType: 'application/x-www-form-urlencoded',
                params: [
                    { name: 'a', value: '1' },
                    { name: 'b', value: 'x y' },
                ],
            },
        });
    });

    it('writes a form as multipart, a file by its name, and drops every Content-Type', () => {
        expect(
            harRequestOf(
                requestOf(
                    {
                        type: 'form',
                        fields: [
                            { name: 'a', value: '1', kind: 'text' },
                            { name: 'doc', value: 'report.pdf', kind: 'file' },
                        ],
                    },
                    [
                        ['Content-Type', 'multipart/form-data; boundary=x'],
                        ['X-A', '1'],
                    ],
                ),
            ),
        ).toMatchObject({
            headers: [{ name: 'X-A', value: '1' }],
            postData: {
                mimeType: 'multipart/form-data',
                params: [
                    { name: 'a', value: '1' },
                    { name: 'doc', fileName: 'report.pdf' },
                ],
            },
        });
    });
});
