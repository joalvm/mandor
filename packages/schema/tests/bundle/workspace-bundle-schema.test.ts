import { describe, expect, it } from 'vitest';

import { workspaceBundleSchema } from '../../src/bundle/workspace-bundle-schema.js';

const minimal = {
    mandor: 'workspace',
    formatVersion: 1,
    app: 'sync',
    workspace: { name: 'Tienda' },
};

describe('workspaceBundleSchema', () => {
    it('fills in what a small bundle leaves out: nothing of it is a decision', () => {
        expect(workspaceBundleSchema.parse(minimal)).toEqual({
            ...minimal,
            workspace: { name: 'Tienda', variables: [] },
            environments: [],
            collections: [],
            globals: [],
            docs: [],
            connections: [],
        });
    });

    it('keeps the body of an item whole, whatever its kind puts there', () => {
        const body = { method: 'GET', url: '{{baseUrl}}/pets', extra: { nested: [1, 2] } };
        const parsed = workspaceBundleSchema.parse({
            ...minimal,
            collections: [
                {
                    name: 'Pets',
                    folders: [{ name: 'Admin', items: [{ kind: 'request', name: 'List', body }] }],
                },
            ],
        });

        expect(parsed.collections[0]?.folders[0]?.items[0]).toEqual({
            kind: 'request',
            name: 'List',
            tags: [],
            body,
        });
    });

    it('accepts a concrete auth on the workspace, a collection and a folder', () => {
        const auth = { type: 'bearer', token: '{{token}}' };
        const parsed = workspaceBundleSchema.parse({
            ...minimal,
            workspace: { name: 'Tienda', auth },
            collections: [{ name: 'Pets', auth, folders: [{ name: 'Admin', auth }] }],
        });

        expect(parsed.workspace.auth).toEqual(auth);
        expect(parsed.collections[0]?.auth).toEqual(auth);
        expect(parsed.collections[0]?.folders[0]?.auth).toEqual(auth);
    });

    it('reads folders inside folders at any depth, each with what it declares', () => {
        const auth = { type: 'bearer', token: '{{token}}' };
        const parsed = workspaceBundleSchema.parse({
            ...minimal,
            collections: [
                {
                    name: 'Pets',
                    folders: [
                        {
                            name: 'A',
                            folders: [
                                {
                                    name: 'B',
                                    auth,
                                    folders: [
                                        {
                                            name: 'C',
                                            items: [{ kind: 'request', name: 'List', body: {} }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        const b = parsed.collections[0]?.folders[0]?.folders[0];

        expect(b?.auth).toEqual(auth);
        expect(b?.folders[0]?.items[0]?.name).toBe('List');
        expect(b?.folders[0]?.folders).toEqual([]);
    });

    it('carries the four settings on a collection and on a folder alike', () => {
        const settings = {
            description: 'Lo suyo',
            variables: [{ name: 'a', value: '1', enabled: true, secret: false }],
            auth: { type: 'none' },
            headers: [{ key: 'X-A', value: '1', enabled: true }],
        };
        const parsed = workspaceBundleSchema.parse({
            ...minimal,
            collections: [{ name: 'Pets', ...settings, folders: [{ name: 'Admin', ...settings }] }],
        });

        expect(parsed.collections[0]).toMatchObject(settings);
        expect(parsed.collections[0]?.folders[0]).toMatchObject(settings);
    });

    it('takes the globals of the origin, secrets marked', () => {
        const globals = [{ name: 'token', value: '', enabled: true, secret: true }];

        expect(workspaceBundleSchema.parse({ ...minimal, globals }).globals).toEqual(globals);
    });

    it('reads a flat bundle of the first version, its folders with no folders inside', () => {
        const parsed = workspaceBundleSchema.parse({
            ...minimal,
            formatVersion: 1,
            collections: [{ name: 'Pets', folders: [{ name: 'Admin' }] }],
        });

        expect(parsed.collections[0]?.folders[0]).toEqual({
            name: 'Admin',
            variables: [],
            headers: [],
            folders: [],
            items: [],
        });
    });

    it('accepts the environments and the connections the domain accepts', () => {
        const parsed = workspaceBundleSchema.parse({
            ...minimal,
            app: 'async',
            environments: [
                {
                    id: 'prod',
                    name: 'Prod',
                    variables: [{ name: 'token', value: '', enabled: true, secret: true }],
                },
            ],
            connections: [
                {
                    id: 'pedidos',
                    name: 'Pedidos',
                    transport: 'websocket',
                    url: 'wss://api.test/ws',
                    headers: [],
                    environmentId: null,
                },
            ],
        });

        expect(parsed.environments).toHaveLength(1);
        expect(parsed.connections[0]?.url).toBe('wss://api.test/ws');
    });

    it.each([
        ['a root that is not a workspace', { ...minimal, mandor: 'collection' }],
        ['an app the repo has no path for', { ...minimal, app: 'graphql' }],
        ['a version that is not a whole number', { ...minimal, formatVersion: 1.5 }],
        ['a workspace with a blank name', { ...minimal, workspace: { name: ' ' } }],
        [
            'a folder variable that is secret: the file goes to git',
            {
                ...minimal,
                collections: [
                    {
                        name: 'Pets',
                        folders: [
                            {
                                name: 'Admin',
                                variables: [{ name: 'k', value: 'v', enabled: true, secret: true }],
                            },
                        ],
                    },
                ],
            },
        ],
        [
            'a workspace variable that is secret: the file goes to git',
            {
                ...minimal,
                workspace: {
                    name: 'Tienda',
                    variables: [{ name: 'k', value: 'v', enabled: true, secret: true }],
                },
            },
        ],
        ['a note that is not a file name', { ...minimal, docs: [{ name: '../x.md', text: '' }] }],
        [
            'a connection whose url does not speak its transport',
            {
                ...minimal,
                connections: [
                    {
                        id: 'a',
                        name: 'A',
                        transport: 'socketio',
                        url: 'wss://api.test',
                        headers: [],
                        environmentId: null,
                    },
                ],
            },
        ],
    ])('refuses %s', (_reason, bundle) => {
        expect(workspaceBundleSchema.safeParse(bundle).success).toBe(false);
    });
});
