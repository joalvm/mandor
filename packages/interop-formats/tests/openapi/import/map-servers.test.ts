import { describe, expect, it } from 'vitest';

import { serversOf } from '../../../src/openapi/import/map-servers.js';

describe('the servers an OpenAPI document offers', () => {
    it('names one by what it says it is, with its protocol and the rest as written', () => {
        const [server] = serversOf({
            servers: [
                { url: 'https://api.example.com/v1', description: 'Production', 'x-region': 'eu' },
            ],
        });

        expect(server).toEqual({
            name: 'Production',
            url: 'https://api.example.com/v1',
            protocol: 'https',
            security: [],
            variables: {},
            extras: { 'x-region': 'eu' },
        });
    });

    it('falls back to the url for a name, and a url with no scheme is the web', () => {
        const [server] = serversOf({ servers: [{ url: '/relative', description: '  ' }] });

        expect(server?.name).toBe('/relative');
        expect(server?.protocol).toBe('http');
    });

    it('keeps names unique within the document', () => {
        const servers = serversOf({
            servers: [
                { url: 'https://a.example.com', description: 'Shop' },
                { url: 'https://b.example.com', description: 'Shop' },
                { url: 'https://c.example.com', description: 'Shop' },
            ],
        });

        expect(servers.map((server) => server.name)).toEqual(['Shop', 'Shop (2)', 'Shop (3)']);
    });

    it('carries the variables of the url with their defaults, as text', () => {
        const [server] = serversOf({
            servers: [
                {
                    url: 'https://{env}.example.com:{port}',
                    variables: {
                        env: { default: 'prod', enum: ['prod', 'staging'], description: 'Where' },
                        port: { default: 443 },
                    },
                },
            ],
        });

        expect(server?.variables).toEqual({
            env: { default: 'prod', enum: ['prod', 'staging'], description: 'Where' },
            port: { default: '443', enum: undefined, description: undefined },
        });
    });

    it('is empty when the document names no server', () => {
        expect(serversOf({})).toEqual([]);
    });
});
