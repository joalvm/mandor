import { describe, expect, it } from 'vitest';

import type { Environment } from '@mandor/schema';

import { serversOfEnvironments } from '../../src/workspace/servers-of-environments.js';

function environment(overrides: Partial<Environment> = {}): Environment {
    return {
        id: 'local',
        name: 'Local',
        variables: [{ name: 'baseUrl', value: 'http://127.0.0.1', enabled: true, secret: false }],
        ...overrides,
    };
}

describe('the servers the environments offer', () => {
    it('says too the address of the environments a cut only reaches', () => {
        const servers = serversOfEnvironments([], [environment()]);

        expect(servers.map(({ name, url }) => [name, url])).toEqual([
            ['Local', 'http://127.0.0.1'],
        ]);
    });

    it('answers no server for an environment without a baseUrl', () => {
        const without = environment({ variables: [] });
        const off = environment({
            variables: [
                { name: 'baseUrl', value: 'http://127.0.0.1', enabled: false, secret: false },
            ],
        });
        const empty = environment({
            variables: [{ name: 'baseUrl', value: '', enabled: true, secret: false }],
        });

        expect(serversOfEnvironments([without, off, empty])).toEqual([]);
    });

    it('speaks the baseUrl as the url, its braces the placeholders they are', () => {
        const server = serversOfEnvironments([
            environment({
                variables: [
                    {
                        name: 'baseUrl',
                        value: 'http://127.0.0.1:{{port}}',
                        enabled: true,
                        secret: false,
                    },
                    { name: 'port', value: '5123', enabled: true, secret: false },
                ],
            }),
        ])[0];

        expect(server).toMatchObject({
            name: 'Local',
            url: 'http://127.0.0.1:{port}',
            protocol: 'http',
            security: [],
            extras: {},
        });
        expect(server?.variables).toEqual({ port: { default: '5123' } });
    });

    it('leaves a placeholder empty when its variable is missing, off or secret', () => {
        const server = serversOfEnvironments([
            environment({
                variables: [
                    {
                        name: 'baseUrl',
                        value: '{{scheme}}://a.b/{{x}}',
                        enabled: true,
                        secret: false,
                    },
                    { name: 'scheme', value: 'https', enabled: false, secret: false },
                    { name: 'token', value: 's', enabled: true, secret: true },
                ],
            }),
        ])[0];

        expect(server?.url).toBe('{scheme}://a.b/{x}');
        expect(server?.variables).toEqual({
            scheme: { default: '' },
            x: { default: '' },
        });
    });

    it('names repeated environments apart', () => {
        const servers = serversOfEnvironments([environment(), environment(), environment()]);

        expect(servers.map((server) => server.name)).toEqual(['Local', 'Local (2)', 'Local (3)']);
    });

    it('leaves the other variables of the environment out', () => {
        const server = serversOfEnvironments([
            environment({
                variables: [
                    { name: 'baseUrl', value: 'http://127.0.0.1', enabled: true, secret: false },
                    { name: 'token', value: 's', enabled: true, secret: false },
                ],
            }),
        ])[0];

        expect(server?.variables).toEqual({});
    });
});
