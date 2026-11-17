import { describe, expect, it } from 'vitest';

import type { CollectionItem } from '@mandor/schema';

import { workspaceToIr } from '../../src/workspace/workspace-to-interop.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';

function requestItem(overrides: Record<string, unknown> = {}): CollectionItem {
    return {
        kind: 'request',
        name: 'listaMascotas',
        tags: [],
        body: {
            method: 'GET',
            url: '{{baseUrl}}/pets',
            body: { type: 'none' },
            examples: [],
            settings: {
                timeoutMs: 30_000,
                followRedirects: true,
                maxRedirects: 5,
                validateTls: true,
            },
            ...overrides,
        },
    };
}

function workspace(overrides: Partial<WorkspaceData> = {}): WorkspaceData {
    return {
        name: 'Pasarela',
        connections: [],
        environments: [],
        globals: [],
        docs: [],
        collections: [],

        ...overrides,
    };
}

const BASE = { name: 'baseUrl', value: 'http://127.0.0.1:5123', enabled: true, secret: false };

describe('the HTTP side of a workspace with requests', () => {
    it('says nothing of HTTP for a workspace of messages alone', () => {
        const ir = workspaceToIr(
            workspace({
                environments: [
                    {
                        id: 'local',
                        name: 'Local',
                        variables: [
                            {
                                name: 'baseUrl',
                                value: 'http://127.0.0.1',
                                enabled: true,
                                secret: false,
                            },
                        ],
                    },
                ],
            }),
        );

        expect(ir.servers).toEqual([]);
        expect(ir.security).toEqual({});
        expect(ir.defaultSecurity).toEqual([]);
    });

    it('adds the servers of the environments and the chain of security when requests speak', () => {
        const ir = workspaceToIr(
            workspace({
                auth: { type: 'bearer', token: 'workspace' },
                environments: [
                    {
                        id: 'local',
                        name: 'Local',
                        variables: [
                            {
                                name: 'baseUrl',
                                value: 'http://127.0.0.1:{{port}}',
                                enabled: true,
                                secret: false,
                            },
                            { name: 'port', value: '5123', enabled: true, secret: false },
                        ],
                    },
                ],
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [
                            {
                                name: 'mascotas',
                                settings: {
                                    variables: [],
                                    auth: {
                                        type: 'apikey',
                                        name: 'X-Key',
                                        value: '',
                                        in: 'header',
                                    },
                                    headers: [],
                                },
                                folders: [],
                                items: [requestItem()],
                            },
                        ],
                        items: [],
                    },
                ],
            }),
        );

        expect(ir.servers).toEqual([
            {
                name: 'Local',
                url: 'http://127.0.0.1:{port}',
                protocol: 'http',
                security: [],
                variables: { port: { default: '5123' } },
                extras: {},
            },
        ]);
        expect(ir.security).toEqual({
            bearerAuth: { type: 'http', extras: { scheme: 'bearer' } },
            apiKeyAuth: { type: 'apiKey', extras: { name: 'X-Key', in: 'header' } },
        });
        expect(ir.defaultSecurity).toEqual(['bearerAuth']);
        expect(ir.operations[0]?.http?.security).toEqual(['apiKeyAuth']);
        expect(ir.channels).toEqual([{ name: '/pets', address: '/pets', extras: {} }]);
    });

    it('says the environments a collection only reaches as servers', () => {
        const ir = workspaceToIr(
            workspace({
                serverEnvironments: [{ id: 'local', name: 'Local', variables: [BASE] }],
                collections: [
                    {
                        name: 'tienda',
                        settings: { variables: [], headers: [] },
                        folders: [],
                        items: [requestItem()],
                    },
                ],
            }),
        );

        expect(ir.servers.map(({ url }) => url)).toEqual(['http://127.0.0.1:5123']);
    });

    it('tags a request at the top of a collection with the collection, and its auth', () => {
        const ir = workspaceToIr(
            workspace({
                collections: [
                    {
                        name: 'tienda',
                        settings: {
                            variables: [],
                            auth: { type: 'apikey', name: 'X-Key', value: '', in: 'header' },
                            headers: [],
                        },
                        folders: [],
                        items: [requestItem()],
                    },
                ],
            }),
        );

        expect(ir.operations[0]?.http?.tags).toEqual(['tienda']);
        expect(ir.operations[0]?.http?.security).toEqual(['apiKeyAuth']);
    });
});
