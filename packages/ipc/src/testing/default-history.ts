import type { HistoryEntry } from '@mandor/schema';

import type { HistoryArea } from '../history/history-area.js';
import { success } from '../result/success.js';

/**
 * The history area a test gets when it says nothing about the history: it is empty, nothing is
 * ever appended, and every method answers success with the smallest value its channel accepts.
 */
export function defaultHistory(): HistoryArea {
    return {
        list: () => Promise.resolve(success({ entries: [] })),
        read: () => Promise.resolve(success(emptyEntry())),
        remove: () => Promise.resolve(success({})),
        configure: () => Promise.resolve(success({})),
        onAppended: () => () => undefined,
    };
}

function emptyEntry(): HistoryEntry {
    return {
        id: '00000000-0000-4000-8000-000000000000',
        workspaceId: 'demo',
        itemPath: 'ping',
        environmentId: null,
        sentAt: '1970-01-01T00:00:00.000Z',
        request: { method: 'GET', url: 'http://localhost/', headers: [], body: null },
        outcome: { kind: 'failure', code: 'request-failed', message: '' },
    };
}
