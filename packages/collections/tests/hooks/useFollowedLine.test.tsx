import { shellStore } from '@mandor/shell';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { useFollowedLine } from '../../src/hooks/useFollowedLine.js';

const PAGADO = 'mandor://local/events/item/pedidos/2026/pagado';
const ENVIO = 'mandor://local/events/item/envios/creado';

function bringToFront(id: string, resource: string): void {
    act(() => {
        const shell = shellStore.getState();

        shell.openTab(shell.activeGroupId, { id, kind: 'item', resource });
    });
}

afterEach(() => {
    // The hook lets go of the store before the store starts over, or it would hear the reset.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

/** The line of the tab in front is the one the tree marks, as an explorer follows the editor. */
describe('the line the tree follows', () => {
    it('is the line of the tab in front, with its folders open and taken alone', () => {
        collectionStore.getState().fold('events', 'pedidos', true);
        collectionStore.getState().fold('events', 'pedidos/2026', true);
        bringToFront('pagado', PAGADO);

        const { result } = renderHook(() => useFollowedLine('events'));

        expect(result.current).toBe('pedidos/2026/pagado');
        expect(collectionStore.getState().folded['events']).toEqual([]);
        expect(collectionStore.getState().selected).toEqual(['pedidos/2026/pagado']);
    });

    it('moves to the next tab that comes to the front', () => {
        bringToFront('pagado', PAGADO);

        const { result } = renderHook(() => useFollowedLine('events'));

        bringToFront('envio', ENVIO);

        expect(result.current).toBe('envios/creado');
        expect(collectionStore.getState().selected).toEqual(['envios/creado']);
    });

    it('is nothing while no tab is in front', () => {
        const { result } = renderHook(() => useFollowedLine('events'));

        expect(result.current).toBeNull();
        expect(collectionStore.getState().selected).toEqual([]);
    });

    it('leaves the tree alone for a tab of another workspace', () => {
        bringToFront('billing', 'mandor://local/billing/item/pedidos/pagado');

        const { result } = renderHook(() => useFollowedLine('events'));

        expect(result.current).toBeNull();
        expect(collectionStore.getState().selected).toEqual([]);
    });
});
