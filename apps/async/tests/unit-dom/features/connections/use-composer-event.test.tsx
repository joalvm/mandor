import { collectionStore } from '@mandor/collections';
import type { CollectionNode } from '@mandor/schema';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { composerEventsStore } from '../../../../src/renderer/events/composer-events-store.js';
import { useComposerEvent } from '../../../../src/renderer/features/connections/hooks/useComposerEvent.js';

const EVENT = {
    eventName: 'Saludo',
    eventResource: 'mandor://demo/payments/item/message/saludo',
    payload: '',
    payloadType: 'json' as const,
    schema: '',
};

const FILED = {
    ...EVENT,
    eventResource: 'mandor://demo/payments/item/mensajes/saludo',
};

const TREE: CollectionNode[] = [
    {
        children: [
            {
                itemKind: 'message',
                kind: 'item',
                name: 'Saludo cordial',
                path: 'mensajes/saludo',
                tags: [],
            },
        ],
        kind: 'folder',
        name: 'Mensajes',
        path: 'mensajes',
    },
];

describe('the event being composed, with the trail it hangs from', () => {
    beforeEach(() => {
        collectionStore.getState().reset();
        composerEventsStore.getState().reset();
    });

    it('holds no event and no trail while the connection has none open', () => {
        const { result } = renderHook(() => useComposerEvent('alpha'));

        expect(result.current.composerEvent).toBeUndefined();
        expect(result.current.crumbs).toEqual([]);
    });

    /** Closing is of the connection, so what it drops is the event of that connection alone. */
    it('drops the event of the connection it was asked about', () => {
        act(() => {
            composerEventsStore.getState().select('alpha', EVENT);
            composerEventsStore.getState().select('beta', EVENT);
        });

        const { result } = renderHook(() => useComposerEvent('alpha'));

        act(() => {
            result.current.onClose();
        });

        expect(composerEventsStore.getState().byConnection['alpha']).toBeUndefined();
        expect(composerEventsStore.getState().byConnection['beta']).toBeDefined();
    });

    it('reads the trail of the event the composer holds', () => {
        act(() => {
            composerEventsStore.getState().select('alpha', EVENT);
        });

        const { result } = renderHook(() => useComposerEvent('alpha'));

        expect(result.current.composerEvent?.eventName).toBe('Saludo');
        expect(result.current.crumbs).toEqual(['Saludo']);
    });

    /**
     * A rename reaches the composer through the collection, never through what was copied the day
     * the event was opened: the trail keeps the folders it hung from and takes the new name.
     */
    it('names the event as the collection names it now, under the folders it is filed in', () => {
        act(() => {
            collectionStore.getState().setNodes(TREE);
            composerEventsStore.getState().select('alpha', FILED);
        });

        const { result } = renderHook(() => useComposerEvent('alpha'));

        expect(result.current.eventName).toBe('Saludo cordial');
        expect(result.current.crumbs).toEqual(['Mensajes', 'Saludo cordial']);
    });
});
