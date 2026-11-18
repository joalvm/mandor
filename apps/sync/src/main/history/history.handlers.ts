import { rootedHandler, type HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    historyDeleteRequestSchema,
    historyListRequestSchema,
    historyReadRequestSchema,
    type Channel,
} from '@mandor/ipc';
import { historySummaryOf } from '@mandor/schema';
import { readHistoryEntry, shapeHistory } from '@mandor/store-fs';

import { deleteHistory } from './delete-history.js';

const CHANNEL_LIST: Channel[] = [
    CHANNELS.historyList,
    CHANNELS.historyRead,
    CHANNELS.historyDelete,
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

/** The three channels of the history: list the sends, read one, delete some or all. */
export function registerHistoryHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.historyList, (_event, raw) => listHistoryChannel(raw));
    ipc.handle(CHANNELS.historyRead, (_event, raw) => readHistoryChannel(raw));
    ipc.handle(CHANNELS.historyDelete, (_event, raw) => deleteHistoryChannel(raw));

    return () => {
        CHANNEL_LIST.forEach((channel) => {
            ipc.removeHandler(channel);
        });
    };
}
