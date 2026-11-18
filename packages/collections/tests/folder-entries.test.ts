import { describe, expect, it } from 'vitest';

import { folderResource } from '../src/lib/folder-resource.js';
import { folderEntries } from '../src/search/folder-entries.js';

import { TWO_FOLDERS } from './support/two-folders.js';

describe('the search entries of the collections and folders', () => {
    it('makes one entry per group of the tree, named by what holds it', () => {
        const entries = folderEntries(
            [
                {
                    children: [
                        {
                            children: [],
                            kind: 'folder',
                            name: 'Forget Password',
                            path: 'session/forget',
                        },
                        {
                            itemKind: 'request',
                            kind: 'item',
                            name: 'Login',
                            path: 'session/login',
                            tags: [],
                        },
                    ],
                    kind: 'collection',
                    name: 'Session',
                    path: 'session',
                },
            ],
            'Local',
            'ws',
        );

        expect(entries).toEqual([
            {
                name: 'Session',
                resource: folderResource('Local', 'ws', 'session'),
                source: 'folder',
                tags: [],
                trail: '',
            },
            {
                name: 'Forget Password',
                resource: folderResource('Local', 'ws', 'session/forget'),
                source: 'folder',
                tags: [],
                trail: 'Session',
            },
        ]);
    });

    it('finds every folder of a tree that holds them side by side', () => {
        expect(folderEntries(TWO_FOLDERS, 'Local', 'ws').map((entry) => entry.name)).toEqual([
            'Pedidos',
            'Envios',
        ]);
    });
});
