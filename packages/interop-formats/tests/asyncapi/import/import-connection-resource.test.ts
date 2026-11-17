import { describe, expect, it } from 'vitest';

import { documentToInterop } from '../../../src/asyncapi/import/document-to-interop.js';
import { importResourcesOf } from '../../../src/asyncapi/import/import-resources.js';
import { connectionResourceOf } from '../../../src/asyncapi/import/import-connection-resource.js';
import { fingerprintOf, type InteropServer } from '@mandor/interop-core';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function textOf(fixture: string): string {
    return readFileSync(fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url)), 'utf8');
}

const origin = { kind: 'asyncapi', sourceId: 'abc' } as const;

function serverOf(overrides: Partial<InteropServer>): InteropServer {
    return {
        name: 'produccion',
        url: 'wss://pasarela.example/v1',
        protocol: 'wss',
        security: [],
        variables: {},
        extras: {},
        ...overrides,
    };
}

describe('connectionResourceOf', () => {
    it('builds one connection per server, websocket when the wire speaks websocket', async () => {
        const ir = await documentToInterop(textOf('pasarela-3.yaml'));
        const resources = importResourcesOf(ir);
        const origin = { kind: 'asyncapi', sourceId: ir.sourceId } as const;

        expect(resources.filter((resource) => resource.place === 'connection')).toEqual([
            {
                place: 'connection',
                itemKind: null,
                route: 'produccion',
                name: 'produccion',
                fields: {
                    name: 'produccion',
                    url: 'wss://pasarela.ejemplo.com:443/v1',
                    transport: 'websocket',
                    headers: [],
                    bindings: { ws: { bindingVersion: '0.1.0', query: { token: '{{token}}' } } },
                },
                origin: {
                    ...origin,
                    fingerprint: fingerprintOf({
                        name: 'produccion',
                        url: 'wss://pasarela.ejemplo.com:443/v1',
                        transport: 'websocket',
                        headers: [],
                    }),
                },
                degradations: [],
            },
        ]);
    });

    it('reads the socket.io declaration from the server bindings, not only from the protocol', () => {
        const resource = connectionResourceOf(
            serverOf({
                protocol: 'wss',
                extras: { bindings: { ws: { 'x-socketio': true } } },
            }),
            'abc',
        );

        expect(resource.fields).toMatchObject({
            transport: 'socketio',
            url: 'https://pasarela.example/v1',
        });
        const fingerprint = fingerprintOf({
            name: 'produccion',
            url: 'https://pasarela.example/v1',
            transport: 'socketio',
            headers: [],
        });

        expect(resource.origin).toEqual({ ...origin, fingerprint });
    });

    it('names a plain websocket server without complaints', () => {
        const resource = connectionResourceOf(serverOf({}), 'abc');

        expect(resource.fields).toMatchObject({
            transport: 'websocket',
            url: 'wss://pasarela.example/v1',
        });
        expect(resource.degradations).toEqual([]);
    });
});
