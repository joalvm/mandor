import { collectionStore, itemResource } from '@mandor/collections';
import { formatResourceUri } from '@mandor/schema';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useRequestPlace } from '../../../../src/renderer/features/requests/hooks/useRequestPlace.js';
import { useRequestTrail } from '../../../../src/renderer/features/requests/hooks/useRequestTrail.js';

const RESOURCE = itemResource('Local', 'tienda', 'pedidos/crear');

function loadTree(): void {
    collectionStore.getState().setNodes([
        {
            children: [
                {
                    itemKind: 'request',
                    kind: 'item',
                    name: 'Crear',
                    path: 'pedidos/crear',
                    tags: [],
                },
            ],
            kind: 'collection',
            name: 'Pedidos',
            path: 'pedidos',
        },
    ]);
}

describe('the trail of a request', () => {
    afterEach(() => {
        cleanup();
    });

    it('says the name the request goes by now, with what holds it', () => {
        loadTree();

        const { result } = renderHook(() => useRequestPlace(RESOURCE));

        expect(result.current).toEqual({ name: 'Crear', trail: ['Pedidos'] });
    });

    /** The workspace is named by the title bar; the trail starts at the collection. */
    it('names what holds the request, and never the workspace', () => {
        loadTree();

        const { result } = renderHook(() => useRequestTrail(RESOURCE));

        expect(result.current).toEqual(['Pedidos']);
    });

    it('is empty for a resource that is not an item', () => {
        const { result } = renderHook(() =>
            useRequestTrail(formatResourceUri({ name: 'settings', scope: 'app' })),
        );

        expect(result.current).toEqual([]);
    });
});
