import { renderHook } from '@testing-library/react';
import { formatResourceUri, type CollectionNode } from '@mandor/schema';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { useItemName } from '../../src/hooks/useItemName.js';
import { itemNameOf, nameOnTree } from '../../src/lib/item-name.js';
import { itemResource } from '../../src/lib/item-resource.js';

const RESOURCE = itemResource('Local', 'local', 'acceso/login');

function treeNamed(name: string): CollectionNode[] {
    return [
        {
            children: [
                {
                    examples: [],
                    itemKind: 'request',
                    kind: 'item',
                    name,
                    path: 'acceso/login',
                    tags: [],
                },
            ],
            kind: 'collection',
            name: 'Acceso',
            path: 'acceso',
        },
    ] as CollectionNode[];
}

beforeEach(() => {
    collectionStore.getState().setNodes(treeNamed('Entrar'));
});

describe('the name an item goes by', () => {
    it('is the one on the tree, whatever a tab read before', () => {
        expect(itemNameOf(RESOURCE, 'New request')).toBe('Entrar');
    });

    it('falls back to what the caller holds when the tree has no such item', () => {
        expect(itemNameOf(itemResource('Local', 'local', 'otra/cosa'), 'Suelto')).toBe('Suelto');
    });

    it('is nobody for a resource that is not an item', () => {
        expect(
            nameOnTree(treeNamed('Entrar'), formatResourceUri({ name: 'settings', scope: 'app' })),
        ).toBeNull();
    });

    it('follows a rename while a view is looking', () => {
        const { result } = renderHook(() => useItemName(RESOURCE));

        expect(result.current).toBe('Entrar');

        act(() => {
            collectionStore.getState().setNodes(treeNamed('Acceder'));
        });

        expect(result.current).toBe('Acceder');
    });
});
