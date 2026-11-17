import type { SyncResponse } from '@mandor/transport-sync';
import { buildSchema, getIntrospectionQuery, graphqlSync } from 'graphql';
import { describe, expect, it } from 'vitest';

import { introspectionOf } from '../../../../src/main/graphql/introspection-of.js';

function answer(body: unknown, status = 200): SyncResponse {
    const bytes = new TextEncoder().encode(typeof body === 'string' ? body : JSON.stringify(body));

    return {
        status,
        statusText: '',
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

const SCHEMA = buildSchema('type Query { ping: String }');
const DATA = graphqlSync({ schema: SCHEMA, source: getIntrospectionQuery() }).data;

describe('reading what a server answered to the introspection query', () => {
    it('hands over the introspection, as the server wrote it', () => {
        expect(introspectionOf(answer({ data: DATA }))).toEqual({ ok: true, introspection: DATA });
    });

    it('reads the answer of a server that puts it in a 400 as well as in a 200', () => {
        expect(introspectionOf(answer({ data: DATA }, 400))).toMatchObject({ ok: true });
    });

    it('says what the server said when it refused', () => {
        expect(
            introspectionOf(answer({ errors: [{ message: 'introspection is disabled' }] }, 400)),
        ).toEqual({ ok: false, message: 'introspection is disabled' });
    });

    it('names the status of an answer that holds neither data nor an error', () => {
        expect(introspectionOf(answer({}, 404))).toEqual({
            ok: false,
            message: 'The answer has no data (HTTP 404)',
        });
        expect(introspectionOf(answer({ errors: [{ nope: 1 }] }, 500))).toEqual({
            ok: false,
            message: 'The answer has no data (HTTP 500)',
        });
        expect(introspectionOf(answer({ errors: 'x' }, 500))).toMatchObject({ ok: false });
    });

    it('says an answer is not JSON, with its status', () => {
        expect(introspectionOf(answer('<html>', 502))).toEqual({
            ok: false,
            message: 'The answer is not JSON (HTTP 502)',
        });
        expect(introspectionOf(answer('42'))).toMatchObject({ ok: false });
    });

    it('says what is wrong with data that is not a schema', () => {
        expect(introspectionOf(answer({ data: { hello: 1 } }))).toEqual({
            ok: false,
            message: 'The answer has no __schema',
        });
    });

    it('refuses a schema that did not fit in memory', () => {
        const spilled: SyncResponse = {
            ...answer({}),
            body: { kind: 'spilled', ref: 'abc', bytes: 20_000_000, sha256: 'f'.repeat(64) },
        };

        expect(introspectionOf(spilled)).toEqual({
            ok: false,
            message: 'The schema is bigger than 16 MiB',
        });
    });
});
