import type { CollectionNode } from '@mandor/schema';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CollectionRowProvider } from '../src/collection-row-context.js';
import { useCollectionRow } from '../src/hooks/useCollectionRow.js';

const NODE: CollectionNode = {
    kind: 'collection',
    name: 'Pedidos',
    path: 'pedidos',
    children: [],
};

describe('the row a line of its menu reads (useCollectionRow)', () => {
    it('is the one its menu gives', () => {
        const { result } = renderHook(() => useCollectionRow(), {
            wrapper: ({ children }) => (
                <CollectionRowProvider value={{ node: NODE, workspaceId: 'events' }}>
                    {children}
                </CollectionRowProvider>
            ),
        });

        expect(result.current).toEqual({ node: NODE, workspaceId: 'events' });
    });

    it('is refused outside the menu of a row', () => {
        expect(() => {
            renderHook(() => useCollectionRow());
        }).toThrow('useCollectionRow is only read inside the menu of a row');
    });
});
