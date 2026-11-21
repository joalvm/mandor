import { shellStore } from '@mandor/shell';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { useRevealedLine } from '../src/hooks/useRevealedLine.js';

afterEach(() => {
    // The hook lets go of the store before the store starts over, or it would hear the reset.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('the item a tab asks the collection to show', () => {
    it('opens every folder it sits in and takes it', () => {
        collectionStore.getState().fold('events', 'pedidos', true);
        collectionStore.getState().fold('events', 'pedidos/2026', true);
        shellStore.getState().setRevealing('mandor://local/events/item/pedidos/2026/pagado');

        const { result } = renderHook(() => useRevealedLine('events'));

        expect(result.current).toBe('pedidos/2026/pagado');
        expect(collectionStore.getState().folded['events']).toEqual([]);
        expect(collectionStore.getState().selected).toEqual(['pedidos/2026/pagado']);
    });

    it('leaves alone an item of another workspace', () => {
        shellStore.getState().setRevealing('mandor://local/billing/item/pedidos/pagado');

        const { result } = renderHook(() => useRevealedLine('events'));

        expect(result.current).toBeNull();
        expect(collectionStore.getState().selected).toEqual([]);
    });
});
