import { useItemFromDisk } from '@mandor/collections';
import type { MessageItem } from '@mandor/schema';
import { useStore } from 'zustand';

import { loadMessage } from '../lib/load-message.js';
import { reloadMessage } from '../lib/reload-message.js';
import { messagesStore } from '../messages-store.js';

/**
 * The item behind one resource, read the first time somebody looks at it. Two tabs of the same
 * item share the entry, so what one of them saves the other one sees. The file changing on
 * disk without the window reads it again.
 */
export function useMessage(resource: string): MessageItem | undefined {
    useItemFromDisk(resource, { load: loadMessage, reload: reloadMessage });

    return useStore(messagesStore, (state) => state.messages[resource]);
}
