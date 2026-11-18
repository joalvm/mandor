import { fingerprintOf, type InteropDocument, type InteropServer } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { environmentResourcesOf } from '../../../src/openapi/import/environment-resources.js';

function server(name: string, url: string, variables: InteropServer['variables'] = {}) {
    return { name, url, protocol: 'https', security: [], variables, extras: {} };
}

function documentWith(
    servers: InteropServer[],
    security: InteropDocument['security'] = {},
): InteropDocument {
    return {
        name: 'Pets',
        sourceId: 'abc',
        servers,
        security,
        channels: [],
        operations: [],
        defaultSecurity: [],
        payloadSchemas: {},
        notes: [],
        extras: {},
    };
}

function names(fields: Record<string, unknown>) {
    return (fields['variables'] as { name: string }[]).map((variable) => variable.name);
}

describe('the environments of an OpenAPI document', () => {
    it('makes one per server: baseUrl, its variables, and the ones the auth asks for', () => {
        const [environment] = environmentResourcesOf(
            documentWith(
                [
                    server('Production', 'https://{region}.pets.test:{port}/v1', {
                        region: { default: 'eu' },
                        port: { default: '443', enum: ['443', '8443'] },
                    }),
                ],
                { basic: { type: 'http', extras: { scheme: 'basic' } } },
            ),
        );

        expect(environment).toMatchObject({
            place: 'environment',
            itemKind: null,
            route: 'production',
            name: 'Production',
            degradations: [],
        });
        expect(environment?.fields).toEqual({
            name: 'Production',
            variables: [
                {
                    name: 'baseUrl',
                    value: 'https://{{region}}.pets.test:{{port}}/v1',
                    enabled: true,
                    secret: false,
                },
                { name: 'region', value: 'eu', enabled: true, secret: false },
                { name: 'port', value: '443', enabled: true, secret: false },
                { name: 'username', value: '', enabled: true, secret: false },
                { name: 'password', value: '', enabled: true, secret: false },
            ],
        });
    });

    it('owns the names of its variables and nothing of their values', () => {
        const [environment] = environmentResourcesOf(
            documentWith([server('Prod', 'https://a.test')]),
        );

        expect(environment?.origin).toEqual({
            kind: 'openapi',
            sourceId: 'abc',
            fingerprint: fingerprintOf({ name: 'Prod', variables: ['baseUrl'] }),
        });
    });

    it('gives two servers of one name two routes, and keeps a variable once', () => {
        const environments = environmentResourcesOf(
            documentWith(
                [
                    server('Prod', 'https://a.test', { baseUrl: { default: 'x' } }),
                    server('Prod', 'https://b.test'),
                ],
                {
                    a: { type: 'http', extras: { scheme: 'bearer' } },
                    b: { type: 'http', extras: { scheme: 'bearer' } },
                    c: { type: 'http', extras: { scheme: 'digest' } },
                },
            ),
        );

        expect(environments.map((each) => each.route)).toEqual(['prod', 'prod-2']);
        expect(names(environments[0]?.fields ?? {})).toEqual(['baseUrl', 'token']);
    });

    it('makes a default environment with an empty baseUrl when the document has no server', () => {
        const [environment] = environmentResourcesOf(documentWith([]));

        expect(environment).toMatchObject({ route: 'default', name: 'default' });
        expect(environment?.fields['variables']).toEqual([
            { name: 'baseUrl', value: '', enabled: true, secret: false },
        ]);
    });
});
