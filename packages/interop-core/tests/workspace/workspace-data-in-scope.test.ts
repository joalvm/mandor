import type { CollectionItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { workspaceDataInScope } from '../../src/workspace/workspace-data-in-scope.js';
import type { WorkspaceData } from '../../src/workspace/workspace-data.js';

const ITEM: CollectionItem = { kind: 'message', name: 'registrar', tags: [], body: {} };

const DATA: WorkspaceData = {
    name: 'Pasarela',
    auth: { type: 'bearer', token: 'abc' },
    connections: [
        {
            id: 'produccion',
            name: 'Produccion',
            transport: 'websocket',
            url: 'wss://a.example',
            headers: [],
            environmentId: null,
        },
    ],
    environments: [{ id: 'staging', name: 'Staging', variables: [] }],
    globals: [{ name: 'region', value: 'eu', enabled: true, secret: false }],
    docs: [{ name: 'notas.md', title: 'Notas', text: '# Notas' }],
    collections: [
        { name: 'Tienda', settings: { variables: [], headers: [] }, folders: [], items: [ITEM] },
    ],
};

describe('the workspace cut to what a scope covers (workspaceDataInScope)', () => {
    it('hands the workspace over whole when the scope is the workspace', () => {
        expect(workspaceDataInScope(DATA, 'workspace')).toEqual(DATA);
    });

    it('keeps only the collections when the scope is a collection, and the address of the environments for the servers', () => {
        expect(workspaceDataInScope(DATA, 'collection')).toEqual({
            name: 'Tienda',
            connections: [],
            environments: [],
            serverEnvironments: DATA.environments,
            globals: [],
            docs: [],
            collections: DATA.collections,
        });
    });

    it('goes by the workspace when it reaches no collection, or more than one', () => {
        const [tienda] = DATA.collections;
        const several = tienda === undefined ? [] : [tienda, { ...tienda, name: 'Otra' }];

        expect(workspaceDataInScope({ ...DATA, collections: [] }, 'collection').name).toBe(
            'Pasarela',
        );
        expect(workspaceDataInScope({ ...DATA, collections: several }, 'collection').name).toBe(
            'Pasarela',
        );
    });
});
