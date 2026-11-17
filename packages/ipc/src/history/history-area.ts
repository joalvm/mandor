import type { HistoryEntry, HistorySummary } from '@mandor/schema';

import type { Empty, Result } from '../result/result.js';
import type { HistoryAppendedPush } from './history-appended.js';
import type { HistoryDeleteRequest } from './history-delete.js';
import type { HistoryListRequest } from './history-list.js';
import type { HistoryReadRequest } from './history-read.js';

/**
 * The history of the sends of a workspace: list the rows, read one send in full, delete, and the
 * push that says a new one was written. Only Sync serves it, so it sits beside its channels.
 */
export type HistoryArea = {
    /** Rows of the history of one workspace, newest first. */
    list: (input: HistoryListRequest) => Promise<Result<{ entries: HistorySummary[] }>>;
    /** One send in full: the request that left and what came back. */
    read: (input: HistoryReadRequest) => Promise<Result<HistoryEntry>>;
    /** Deletes the sends named, or all of them. */
    remove: (input: HistoryDeleteRequest) => Promise<Result<Empty>>;
    onAppended: (handler: (push: HistoryAppendedPush) => void) => () => void;
};
