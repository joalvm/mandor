import { GraphqlPayloadError } from '@mandor/graphql';
import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { snippetRequestOf } from '../../../../src/main/codegen/snippet-request-of.js';
import type { ResolvedRequest } from '../../../../src/main/request/resolved-request.js';

function resolved(
    body: ResolvedRequest['body'],
    headers: [string, string][] = [],
): ResolvedRequest {
    return {
        method: 'POST',
        url: 'http://api.test/orders',
        headers,
        body,
        settings: createRequestItem({ name: 'Orders' }).settings,
    };
}

describe('the request a snippet is written from', () => {
    it('keeps the method, the url and the headers as they are', () => {
        const { request, leftOutFile } = snippetRequestOf(
            resolved({ type: 'none' }, [['X-A', '1']]),
        );

        expect(request).toEqual({
            method: 'POST',
            url: 'http://api.test/orders',
            headers: [['X-A', '1']],
            body: { type: 'none' },
        });
        expect(leftOutFile).toBeNull();
    });

    it.each([
        ['json', 'application/json'],
        ['xml', 'application/xml'],
        ['text', 'text/plain; charset=utf-8'],
    ] as const)('writes a %s body as text with the type it implies', (type, contentType) => {
        const { request } = snippetRequestOf(resolved({ type, content: 'abc' }));

        expect(request.body).toEqual({ type: 'text', contentType, text: 'abc' });
    });

    /** A send drops the comments and the trailing commas of a JSONC body; the code does too. */
    it('writes a JSON body as the JSON a send puts on the wire, on one line', () => {
        const content =
            '{\n    "email": "a@b.test",\n    "password": "x"\n    //"password": "y"\n}';
        const { request } = snippetRequestOf(resolved({ type: 'json', content }));

        expect(request.body).toEqual({
            type: 'text',
            contentType: 'application/json',
            text: '{"email":"a@b.test","password":"x"}',
        });
    });

    it('prefers the content type the user wrote, whatever the case of its name', () => {
        const { request } = snippetRequestOf(
            resolved({ type: 'json', content: '{}' }, [
                ['Content-Type', 'application/vnd.api+json'],
            ]),
        );

        expect(request.body).toEqual({
            type: 'text',
            contentType: 'application/vnd.api+json',
            text: '{}',
        });
    });

    it('writes a GraphQL body as the payload a send would put on the wire', () => {
        const { request } = snippetRequestOf(
            resolved({ type: 'graphql', query: '{ pets { id } }', variables: '' }),
        );

        expect(request.body).toEqual({
            type: 'text',
            contentType: 'application/json',
            text: JSON.stringify({ query: '{ pets { id } }' }),
        });
    });

    it('refuses a GraphQL body a send would refuse', () => {
        expect(() =>
            snippetRequestOf(
                resolved({ type: 'graphql', query: 'subscription { a }', variables: '' }),
            ),
        ).toThrow(GraphqlPayloadError);
    });

    it('writes the fields of a urlencoded body as pairs', () => {
        const { request } = snippetRequestOf(
            resolved({ type: 'urlencoded', fields: [['a', 'b c']] }),
        );

        expect(request.body).toEqual({ type: 'urlencoded', fields: [['a', 'b c']] });
    });

    it('writes the fields of a form with their name and kind', () => {
        const { request } = snippetRequestOf(
            resolved({
                type: 'form',
                fields: [
                    { key: 'name', value: 'Ana', kind: 'text' },
                    { key: 'logo', value: 'files/logo.png', kind: 'file' },
                ],
            }),
        );

        expect(request.body).toEqual({
            type: 'form',
            fields: [
                { name: 'name', value: 'Ana', kind: 'text' },
                { name: 'logo', value: 'files/logo.png', kind: 'file' },
            ],
        });
    });

    it('leaves a binary body out and says which file it was', () => {
        const { request, leftOutFile } = snippetRequestOf(
            resolved({ type: 'binary', file: 'files/logo.png' }),
        );

        expect(request.body).toEqual({ type: 'none' });
        expect(leftOutFile).toBe('files/logo.png');
    });
});
