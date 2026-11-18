import { collectionStore } from '@mandor/collections';
import type { CollectionNode } from '@mandor/schema';
import { ROOT_GROUP_ID, success } from '@mandor/ipc';
import { selectActiveTabId, shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../src/renderer/app/async-bridge.js';
import { composerEventsStore } from '../../../src/renderer/events/composer-events-store.js';
import { openEventInComposer } from '../../../src/renderer/events/open-event-in-composer.js';

vi.spyOn(asyncBridge.collections, 'readItem').mockResolvedValue(
    success({ kind: 'message', name: 'saludo', payload: 'hola', payloadType: 'json' }),
);

const RESOURCE = 'mandor://local/events/item/message/saludo';

const NODES: CollectionNode[] = [
    {
        children: [
            {
                itemKind: 'message',
                kind: 'item',
                name: 'saludo',
                path: 'message/saludo',
                tags: [],
            },
        ],
        kind: 'folder',
        name: 'message',
        path: 'message',
    },
];

async function flush(connectionId: string): Promise<void> {
    await vi.waitFor(() => {
        expect(composerEventsStore.getState().byConnection[connectionId]).toBeDefined();
    });
}

beforeEach(() => {
    shellStore.getState().reset();
    collectionStore.getState().setNodes(NODES);
    composerEventsStore.getState().reset();
});

describe('opening an event in the composer', () => {
    it('lands the event in the connection of the active group', async () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'alpha',
            kind: 'connection',
            resource: 'mandor://local/connection/alpha',
        });

        expect(openEventInComposer(RESOURCE)).toBe(true);

        await flush('alpha');

        expect(composerEventsStore.getState().byConnection['alpha']).toMatchObject({
            dirty: false,
            eventName: 'saludo',
            eventResource: RESOURCE,
            payload: 'hola',
            payloadType: 'json',
            schema: '',
        });
        expect(selectActiveTabId(shellStore.getState())).toBe('alpha');
    });

    it('lands the event in the connection tab the user is on, not the first of the group', async () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'alpha',
            kind: 'connection',
            resource: 'mandor://local/connection/alpha',
        });
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'beta',
            kind: 'connection',
            resource: 'mandor://local/connection/beta',
        });
        shellStore.getState().setActiveTab(ROOT_GROUP_ID, 'beta');

        expect(openEventInComposer(RESOURCE)).toBe(true);

        await flush('beta');

        expect(composerEventsStore.getState().byConnection['beta']).toMatchObject({
            eventName: 'saludo',
            eventResource: RESOURCE,
        });
        expect(composerEventsStore.getState().byConnection['alpha']).toBeUndefined();
        expect(selectActiveTabId(shellStore.getState())).toBe('beta');
    });

    it('says no when no connection is open, and opens nothing itself', () => {
        expect(openEventInComposer(RESOURCE)).toBe(false);
        expect(composerEventsStore.getState().byConnection).toEqual({});
    });
});
