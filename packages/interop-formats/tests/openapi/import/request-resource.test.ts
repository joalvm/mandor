import {
    degradation,
    fingerprintOf,
    type InteropHttpOperation,
    type InteropOperation,
} from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import {
    requestResourceOf,
    type RequestContext,
} from '../../../src/openapi/import/request-resource.js';

const BEARER = { type: 'http', extras: { scheme: 'bearer' } };

const CONTEXT: RequestContext = {
    sourceId: 'abc',
    route: 'pets/get-a-pet',
    security: { bearerAuth: BEARER },
    workspaceScheme: undefined,
    defaultSecurity: [],
    base: '{{baseUrl}}',
};

function http(overrides: Partial<InteropHttpOperation> = {}): InteropHttpOperation {
    return {
        method: 'GET',
        path: '/pets/{petId}',
        tags: ['pets'],
        parameters: [
            { name: 'petId', in: 'path', required: true, value: '', schema: '{"type":"string"}' },
        ],
        responses: [{ name: '200', status: '200', contentType: 'application/json', body: '{}' }],
        security: null,
        ...overrides,
    };
}

function operation(extras: Record<string, unknown> = {}): InteropOperation {
    return {
        name: 'Get a pet',
        channel: 'pets',
        direction: 'outgoing',
        security: [],
        extras,
    };
}

describe('one OpenAPI operation as a request of the collection', () => {
    it('keeps the path as the document writes it behind the base url of the environment', () => {
        const resource = requestResourceOf(operation(), http(), CONTEXT);

        expect(resource).toMatchObject({
            place: 'item',
            itemKind: 'request',
            route: 'pets/get-a-pet',
            name: 'Get a pet',
            fields: {
                method: 'GET',
                url: '{{baseUrl}}/pets/{petId}',
                pathParams: [{ key: 'petId', required: true }],
                examples: [{ status: '200' }],
            },
            origin: { kind: 'openapi', sourceId: 'abc' },
            degradations: [],
        });
    });

    it('hashes the name and the fields it writes, the way the workspace reads them back', () => {
        const resource = requestResourceOf(operation(), http(), CONTEXT);

        expect(resource.origin.fingerprint).toBe(
            fingerprintOf({ name: 'Get a pet', ...resource.fields }),
        );
    });

    it('inherits the auth of the workspace when the operation asks for nothing or for its scheme', () => {
        const inherited = requestResourceOf(operation(), http({ security: null }), CONTEXT);
        const same = requestResourceOf(operation(), http({ security: ['bearerAuth'] }), {
            ...CONTEXT,
            workspaceScheme: 'bearerAuth',
            defaultSecurity: [],
        });

        expect(inherited.fields).not.toHaveProperty('auth');
        expect(same.fields).not.toHaveProperty('auth');
    });

    it('writes an own auth for a scheme the workspace does not carry', () => {
        const resource = requestResourceOf(
            operation(),
            http({ security: ['bearerAuth'] }),
            CONTEXT,
        );

        expect(resource.fields).toMatchObject({ auth: { type: 'bearer' } });
    });

    it('writes no auth at all for an empty list of schemes', () => {
        const resource = requestResourceOf(operation(), http({ security: [] }), CONTEXT);

        expect(resource.fields).toMatchObject({ auth: { type: 'none' } });
    });

    it('says why a scheme is not imported instead of writing a guess', () => {
        const resource = requestResourceOf(operation(), http({ security: ['missing'] }), CONTEXT);

        expect(resource.fields).not.toHaveProperty('auth');
        expect(resource.degradations).toEqual([
            degradation('securityNotDeclared', { name: 'missing' }),
        ]);
    });

    it('keeps the keys no field claimed, but never one that would overwrite the envelope', () => {
        const resource = requestResourceOf(
            operation({ 'x-internal': true, kind: 'message', name: 'other', tags: ['x'] }),
            http(),
            CONTEXT,
        );

        expect(resource.fields).toMatchObject({ 'x-internal': true });
        expect(resource.fields).not.toHaveProperty('kind');
        expect(resource.fields).not.toHaveProperty('name');
        expect(resource.fields).not.toHaveProperty('tags');
    });

    it('keeps the schema of each answer in its example', () => {
        const example = { name: '200', status: '200', contentType: 'a/b', body: '', schema: '{}' };
        const resource = requestResourceOf(operation(), http({ responses: [example] }), CONTEXT);

        expect(resource.fields).toMatchObject({ examples: [example] });
        expect(resource.fields).not.toHaveProperty('responseSchemas');
    });

    it('keeps on the request the tags after the one that opened its folder', () => {
        const tagged = http({ tags: [' ', 'pets', 'admin', 'beta'] });

        expect(requestResourceOf(operation(), tagged, CONTEXT).fields).toMatchObject({
            tags: ['admin', 'beta'],
        });
        expect(requestResourceOf(operation(), http(), CONTEXT).fields).not.toHaveProperty('tags');
    });
});
