import { collectionStore, itemResource } from '@mandor/collections';
import { failure, success } from '@mandor/ipc';
import { createMessageItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import {
    flushPendingMessageWrite,
    scheduleMessageWrite,
} from '../../../../../src/renderer/features/messages/lib/pending-message-write.js';
import { messagesStore } from '../../../../../src/renderer/features/messages/messages-store.js';

const RESOURCE = itemResource('Local', 'local', 'saludo');

const ON_DISK = createMessageItem({ name: 'saludo', payload: 'del disco' });

beforeEach(() => {
    vi.restoreAllMocks();
    messagesStore.getState().reset();
    messagesStore.getState().setMessage(RESOURCE, ON_DISK);
});

afterEach(async () => {
    await flushPendingMessageWrite(RESOURCE);
});

describe('a message written after it was renamed', () => {
    it('keeps the name the item took, not the one the tab read', async () => {
        const writeItem = vi
            .spyOn(asyncBridge.collections, 'writeItem')
            .mockResolvedValue(success({}));

        collectionStore.getState().setNodes([
            {
                examples: [],
                itemKind: 'message',
                kind: 'item',
                name: 'bienvenida',
                path: 'saludo',
                tags: [],
            },
        ]);
        scheduleMessageWrite(RESOURCE, { ...ON_DISK, payload: 'hola' }, vi.fn());
        await flushPendingMessageWrite(RESOURCE);

        expect(writeItem.mock.calls[0]?.[0].fields.name).toBe('bienvenida');
    });
});

describe('a message whose write is refused', () => {
    /** The keystroke before the last one was never on the file: going back to it is not undoing. */
    it('goes back to what the file holds, not to the edit before the last', async () => {
        const onError = vi.fn();

        vi.spyOn(asyncBridge.collections, 'writeItem').mockResolvedValue(failure('fs-write', 'no'));
        scheduleMessageWrite(RESOURCE, { ...ON_DISK, payload: 'h' }, onError);
        scheduleMessageWrite(RESOURCE, { ...ON_DISK, payload: 'ho' }, onError);
        await flushPendingMessageWrite(RESOURCE);

        expect(messagesStore.getState().messages[RESOURCE]).toEqual(ON_DISK);
        expect(onError).toHaveBeenCalledWith('fs-write');
    });
});
