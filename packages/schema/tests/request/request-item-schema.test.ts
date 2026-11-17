import { describe, expect, it } from 'vitest';

import type { RequestExample } from '../../src/request/request-example.js';
import { requestItemSchema } from '../../src/request/request-item-schema.js';
import { parseRequestItem } from '../../src/request/parse-request-item.js';

/** The request of the spec of Sync, without the `graphql` that a later plan brings. */
const specRequest = {
    name: 'crear pedido',
    method: 'POST',
    url: '{{baseUrl}}/pedidos',
    query: [{ key: 'dryRun', value: 'true', enabled: false }],
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    body: { type: 'json', content: '{ "cliente": "{{clienteId}}", "total": {{total}} }' },
    settings: { timeoutMs: 10000, validateTls: false },
};

const EXAMPLE = { name: 'creado', status: '201', contentType: 'application/json', body: '{}' };

describe('requestItemSchema', () => {
    it('reads the request of the spec and writes it back the same', () => {
        const parsed = requestItemSchema.parse(specRequest);

        expect(parsed).toEqual({
            ...specRequest,
            headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
            pathParams: [],
            examples: [],
        });
        expect(requestItemSchema.parse(parsed)).toEqual(parsed);
    });

    it('reads what an import wrote: path rows with their contract, body schema, examples', () => {
        const example: RequestExample = {
            name: '200',
            status: '200',
            contentType: 'application/json',
            body: '{}',
        };
        const imported = {
            ...specRequest,
            pathParams: [
                { key: 'petId', value: '7', required: true, schema: '{"type":"integer"}' },
            ],
            bodySchema: '{"type":"object"}',
            examples: [example],
        };
        const parsed = requestItemSchema.parse(imported);

        expect(parsed.pathParams).toEqual([{ ...imported.pathParams[0], enabled: true }]);
        expect(parsed.bodySchema).toBe('{"type":"object"}');
        expect(parsed.examples).toEqual(imported.examples);
        expect(requestItemSchema.parse(parsed)).toEqual(parsed);
    });

    it('reads the schema of the answer of each example, and writes it back as read', () => {
        const example = { ...EXAMPLE, schema: '{"type":"object"}' };
        const parsed = requestItemSchema.parse({ ...specRequest, examples: [example] });

        expect(parsed.examples).toEqual([example]);
        expect(requestItemSchema.parse(parsed)).toEqual(parsed);
    });

    it('gives each example of an old file the schema its status kept, and drops the rest', () => {
        const own = { ...EXAMPLE, name: 'propio', schema: '{"type":"array"}' };
        const missing = { ...EXAMPLE, name: 'no encontrado', status: '404' };
        const parsed = requestItemSchema.parse({
            ...specRequest,
            examples: [EXAMPLE, own, missing],
            responseSchemas: { '201': '{"type":"object"}', default: '{}' },
        });

        expect(parsed.examples).toEqual([
            { ...EXAMPLE, schema: '{"type":"object"}' },
            own,
            missing,
        ]);
        expect(parsed).not.toHaveProperty('responseSchemas');
    });

    it('keeps a disabled line on disk: switching off is not erasing', () => {
        const parsed = requestItemSchema.parse(specRequest);

        expect(parsed.query[0]).toEqual({ key: 'dryRun', value: 'true', enabled: false });
    });

    it('keeps repeated keys in the order they were written', () => {
        const parsed = requestItemSchema.parse({
            ...specRequest,
            headers: [
                { key: 'X-Tag', value: 'a' },
                { key: 'X-Tag', value: 'b' },
            ],
        });

        expect(parsed.headers.map((line) => line.value)).toEqual(['a', 'b']);
    });

    it('rejects a method in lower case', () => {
        expect(() => requestItemSchema.parse({ ...specRequest, method: 'post' })).toThrow();
    });

    it('accepts a method that is not one of the standard ones', () => {
        const parsed = requestItemSchema.parse({ ...specRequest, method: 'CLEAN' });

        expect(parsed.method).toBe('CLEAN');
    });

    it('fills what the writer left out: no query, no headers, no body, plain settings', () => {
        const parsed = requestItemSchema.parse({ name: 'raíz', method: 'GET', url: '' });

        expect(parsed.query).toEqual([]);
        expect(parsed.headers).toEqual([]);
        expect(parsed.body).toEqual({ type: 'none' });
        expect(parsed.settings).toEqual({});
    });

    it('reads a graphql body: query and variables as written, the operation optional', () => {
        const body = { type: 'graphql', query: 'query A { a }', operationName: 'A' };
        const parsed = requestItemSchema.parse({ ...specRequest, body });

        expect(parsed.body).toEqual({ ...body, variables: '' });
        expect(requestItemSchema.parse(parsed)).toEqual(parsed);
    });

    it('reads a graphql body with nothing written yet', () => {
        const parsed = requestItemSchema.parse({ ...specRequest, body: { type: 'graphql' } });

        expect(parsed.body).toEqual({ type: 'graphql', query: '', variables: '' });
    });

    it('rejects a body file that leaves the repo', () => {
        expect(() =>
            requestItemSchema.parse({ ...specRequest, body: { type: 'binary', file: '../x.png' } }),
        ).toThrow();
    });

    it('keeps the auth of the request when it is parsed and validated again', () => {
        const parsed = requestItemSchema.parse({ ...specRequest, auth: { inherit: true } });

        expect(parsed.auth).toEqual({ inherit: true });
        expect(requestItemSchema.parse(parsed)).toEqual(parsed);
    });
});

describe('parseRequestItem', () => {
    it('reads the body of one item of the tree, the envelope name in', () => {
        const { name, ...body } = specRequest;

        expect(parseRequestItem({ kind: 'request', name, tags: [], body })).toEqual({
            ...specRequest,
            headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
            pathParams: [],
            examples: [],
        });
    });

    it('reads the scripts an import kept, and refuses one with a key it does not know', () => {
        const script = { event: 'onResponse', dialect: 'postman', source: 'a()' };

        expect(
            requestItemSchema.parse({ name: 'a', importedScripts: [script] }).importedScripts,
        ).toEqual([script]);
        expect(
            requestItemSchema.safeParse({ name: 'a', importedScripts: [{ ...script, x: 1 }] })
                .success,
        ).toBe(false);
    });

    it('reads an example written before it could change its request, and the new fields', () => {
        const old = { name: 'OK', status: '200', contentType: 'application/json', body: '{}' };
        const headers = [{ key: 'Accept', value: 'text/plain' }];
        const grown = {
            ...old,
            headers: [['x-a', '1']],
            request: { headers },
            cookies: [{ name: 'sid', value: '1', httpOnly: true, secure: false }],
        };
        const parsed = requestItemSchema.parse({ name: 'a', examples: [old, grown] });

        expect(parsed.examples[0]).toEqual(old);
        expect(parsed.examples[1]?.request?.headers).toEqual([{ ...headers[0], enabled: true }]);
        expect(parsed.examples[1]?.headers).toEqual([['x-a', '1']]);
    });

    it('lets go of the paths an older file left out of a comparison: an example takes all or none', () => {
        const base = { body: '{}', contentType: 'application/json', name: 'ok', status: '200' };
        const parsed = requestItemSchema.parse({
            name: 'a',
            examples: [{ ...base, ignore: ['/data/token'] }],
        });

        expect(parsed.examples[0]).not.toHaveProperty('ignore');
    });

    it('drops a method an example tried to change: the request owns it', () => {
        const example = {
            name: 'OK',
            status: '200',
            contentType: 'a',
            body: '',
            request: { method: 'PUT' },
        };
        const parsed = requestItemSchema.parse({ name: 'a', examples: [example] });

        expect(parsed.examples[0]?.request).toEqual({});
    });
});
