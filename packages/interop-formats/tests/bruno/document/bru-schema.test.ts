import { describe, expect, it } from 'vitest';

import {
    bruCollectionSchema,
    bruEnvironmentSchema,
    bruRequestSchema,
} from '../../../src/bruno/document/bru-schema.js';

describe('bru-schema', () => {
    it('reads a request, with a sequence that comes as text or as a number', () => {
        expect(bruRequestSchema.parse({ meta: { name: 'a', seq: '2' } }).meta?.seq).toBe('2');
        expect(bruRequestSchema.parse({ meta: { seq: 2 } }).meta?.seq).toBe(2);
    });

    it('reads the rows of a table, a file field holding a list of paths', () => {
        const parsed = bruRequestSchema.parse({
            body: { multipartForm: [{ name: 'f', value: ['a.png'], type: 'file', enabled: true }] },
        });

        expect(parsed.body?.multipartForm?.[0]?.value).toEqual(['a.png']);
    });

    it('keeps the blocks of auth by the name of their scheme', () => {
        expect(bruRequestSchema.parse({ auth: { bearer: { token: 't' } } }).auth).toEqual({
            bearer: { token: 't' },
        });
    });

    it('reads the auth of a level with its mode and the block of the scheme', () => {
        expect(
            bruCollectionSchema.parse({ auth: { mode: 'basic', basic: { username: 'a' } } }).auth,
        ).toEqual({ mode: 'basic', basic: { username: 'a' } });
    });

    it('reads the variables a level sets before each request', () => {
        expect(
            bruCollectionSchema.parse({ vars: { req: [{ name: 'a', value: '1', enabled: true }] } })
                .vars?.req,
        ).toEqual([{ name: 'a', value: '1', enabled: true }]);
    });

    it('reads the variables of an environment, a secret among them', () => {
        expect(
            bruEnvironmentSchema.parse({
                variables: [{ name: 'token', value: '', enabled: true, secret: true }],
            }).variables,
        ).toEqual([{ name: 'token', value: '', enabled: true, secret: true }]);
    });

    it('holds no variable for an environment that names none', () => {
        expect(bruEnvironmentSchema.parse({}).variables).toEqual([]);
    });

    it('refuses a part that is the wrong type', () => {
        expect(() => bruRequestSchema.parse({ headers: 'x' })).toThrow();
        expect(() => bruEnvironmentSchema.parse({ variables: {} })).toThrow();
    });

    it('reads the ws block of a request and the messages it keeps in its body', () => {
        const parsed = bruRequestSchema.parse({
            ws: { url: 'wss://a', body: 'ws', auth: 'inherit' },
            body: {
                mode: 'ws',
                ws: [{ name: 'Hola', type: 'json', content: '{}', selected: true }],
            },
        });

        expect(parsed.ws).toEqual({ url: 'wss://a', body: 'ws', auth: 'inherit' });
        expect(parsed.body?.ws).toEqual([
            { name: 'Hola', type: 'json', content: '{}', selected: true },
        ]);
    });
});
