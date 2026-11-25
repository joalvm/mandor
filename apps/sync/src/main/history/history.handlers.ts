import { rootedHandler, type HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    failure,
    historyConfigureRequestSchema,
    historyDeleteRequestSchema,
    historyListRequestSchema,
    historyReadRequestSchema,
    success,
    type Channel,
} from '@mandor/ipc';
import { historySummaryOf } from '@mandor/schema';
import { readHistoryEntry, shapeHistory } from '@mandor/store-fs';

import { deleteHistory } from './delete-history.js';
import type { HistoryRetention } from './history-retention.js';

const CHANNEL_LIST: Channel[] = [
    CHANNELS.historyList,
    CHANNELS.historyRead,
    CHANNELS.historyDelete,
    CHANNELS.historyConfigure,
];

const listHistoryChannel = rootedHandler(historyListRequestSchema, async (root, input) => {
    const rows = await shapeHistory(root, input.workspaceId, historySummaryOf);
    const entries =
        input.itemPath === undefined ? rows : rows.filter((row) => row.itemPath === input.itemPath);

    return { entries };
});

const readHistoryChannel = rootedHandler(historyReadRequestSchema, (root, input) =>
    readHistoryEntry(root, input.workspaceId, input.id),
);

const deleteHistoryChannel = rootedHandler(historyDeleteRequestSchema, async (root, input) => {
    await deleteHistory(root, input);

    return {};
});

/**
 * The channels of the history: list the sends, read one, delete some or all, and take how much of
 * it the person keeps. The choice needs no origin open: it holds for every one.
 */
export function registerHistoryHandlers(ipc: HandlerIpc, retention: HistoryRetention): () => void {
    ipc.handle(CHANNELS.historyList, (_event, raw) => listHistoryChannel(raw));
    ipc.handle(CHANNELS.historyRead, (_event, raw) => readHistoryChannel(raw));
    ipc.handle(CHANNELS.historyDelete, (_event, raw) => deleteHistoryChannel(raw));
    ipc.handle(CHANNELS.historyConfigure, (_event, raw) => {
        const request = historyConfigureRequestSchema.safeParse(raw);

        if (!request.success) {
            return Promise.resolve(failure('bad-request', request.error.message));
        }

        retention.choose(request.data);

        return Promise.resolve(success({}));
    });

    return () => {
        CHANNEL_LIST.forEach((channel) => {
            ipc.removeHandler(channel);
        });
    };
}
