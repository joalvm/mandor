import { rm } from 'node:fs/promises';

import { GraphqlPayloadError } from '@mandor/graphql';
import { httpResponseSchema } from '@mandor/schema';
import type { SyncResponse } from '@mandor/transport-sync';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { failureOfSend } from '../../../../src/main/request/failure-of-send.js';
import { requestBodyBytes } from '../../../../src/main/request/request-body-bytes.js';
import { resolveRequest } from '../../../../src/main/request/resolve-request.js';
import { httpResponseOf } from '../../../../src/main/request/response-of.js';
import {
    DIRECT_NETWORK,
    placeOf,
    repoWithEnvironment,
    sendInput,
} from './support/resolve-fixture.js';

let root: string;

beforeEach(async () => {
    root = await repoWithEnvironment();
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const NOW = new Date('2026-09-30T10:00:00.000Z');

function answer(text: string): SyncResponse {
    const bytes = new TextEncoder().encode(text);

    return {
        status: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers: [['content-type', 'application/json']],
        body: { kind: 'inline', bytes },
        sizes: {
            transferredBytes: bytes.length,
            bodyBytes: bytes.length,
            decoded: true,
            headerBytes: 0,
            requestHeaderBytes: 0,
            requestBodyBytes: 0,
        },
        timings: { dnsMs: 1, connectMs: 1, tlsMs: 0, firstByteMs: 1, totalMs: 3, viaProxy: false },
        redirects: [],
    };
}

describe('resolving a graphql body', () => {
    it('resolves the variables and leaves the query as written: `{{` in it is GraphQL, not ours', async () => {
        const result = await resolveRequest(
            placeOf(root),
            sendInput({
                url: 'http://a.test/graphql',
                body: {
                    type: 'graphql',
                    query: 'query A($id: ID!) { user(id: $id) { name(prefix: "{{literal}}") } }',
                    variables: '{ "page": {{page}} }',
                    operationName: 'A',
                },
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({
            ok: true,
            value: {
                body: {
                    type: 'graphql',
                    query: 'query A($id: ID!) { user(id: $id) { name(prefix: "{{literal}}") } }',
                    variables: '{ "page": 2 }',
                    operationName: 'A',
                },
            },
        });
    });

    it('leaves a variable nobody defined as the text it was written, like every other text', async () => {
        const result = await resolveRequest(
            placeOf(root),
            sendInput({
                url: 'http://a.test/graphql',
                body: { type: 'graphql', query: '{ a }', variables: '{ "x": "{{nope}}" }' },
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({ ok: true });
        expect(JSON.stringify(result)).toContain('nope');
    });
});

describe('the bytes of a graphql body', () => {
    it('is a JSON post with the content type the user did not write', async () => {
        const sent = await requestBodyBytes(
            root,
            { type: 'graphql', query: '{ a }', variables: '{"id":1}', operationName: undefined },
            [],
        );

        expect(JSON.parse(new TextDecoder().decode(sent.bytes))).toEqual({
            query: '{ a }',
            variables: { id: 1 },
        });
        expect(sent.headers).toEqual([['content-type', 'application/json']]);
    });

    it('keeps the content type the user wrote', async () => {
        const sent = await requestBodyBytes(
            root,
            { type: 'graphql', query: '{ a }', variables: '' },
            [['Content-Type', 'application/graphql-response+json']],
        );

        expect(sent.headers).toEqual([['Content-Type', 'application/graphql-response+json']]);
    });

    it('does not send a subscription: the bytes are never made', async () => {
        const send = requestBodyBytes(
            root,
            { type: 'graphql', query: 'subscription { t }', variables: '' },
            [],
        );

        await expect(send).rejects.toBeInstanceOf(GraphqlPayloadError);
    });
});

describe('the code a graphql body that cannot be sent crosses the bridge with', () => {
    it.each(['variables', 'subscription', 'syntax'] as const)(
        'names `%s` a bad request',
        (reason) => {
            expect(failureOfSend(new GraphqlPayloadError(reason, 'boom'))).toEqual({
                ok: false,
                error: { code: 'bad-request', message: 'boom' },
            });
        },
    );
});

describe('the errors of a graphql answer', () => {
    const FAILED = JSON.stringify({ data: null, errors: [{ message: 'no such user' }] });

    it('are read from a 200 that carries them, and the response still passes its schema', () => {
        const response = httpResponseOf(answer(FAILED), NOW, 'graphql');

        expect(response.graphqlErrors).toEqual({ count: 1, messages: ['no such user'] });
        expect(httpResponseSchema.safeParse(response).success).toBe(true);
    });

    it('are not looked for in a body the request did not send as graphql', () => {
        expect(httpResponseOf(answer(FAILED), NOW, 'json').graphqlErrors).toBeUndefined();
    });

    it('are absent from an answer that went well', () => {
        const response = httpResponseOf(answer('{"data":{"a":1}}'), NOW, 'graphql');

        expect(response.graphqlErrors).toBeUndefined();
    });

    it('are not read from a body that is not text', () => {
        const bytes = Uint8Array.from([0xff, 0xfe, 0x00]);
        const binary = { ...answer(''), body: { kind: 'inline' as const, bytes } };

        expect(
            httpResponseOf({ ...binary, sizes: { ...binary.sizes, bodyBytes: 3 } }, NOW, 'graphql')
                .graphqlErrors,
        ).toBeUndefined();
    });
});
