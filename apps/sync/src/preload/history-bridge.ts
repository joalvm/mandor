import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    historyAppendedPushSchema,
    emptyResultSchema,
    historyListResultSchema,
    historyReadResultSchema,
    type HistoryArea,
} from '@mandor/ipc';

/**
 * The history of the sends: rows, one send in full, deleting, and the push of a new one. Every
 * answer and push is validated at this edge; one out of contract is a bug in main, louder thrown.
 */
export function createHistoryBridge({ call, subscribe }: BridgeKit): HistoryArea {
    return {
        list: (input) => call(CHANNELS.historyList, historyListResultSchema, input),
        read: (input) => call(CHANNELS.historyRead, historyReadResultSchema, input),
        remove: (input) => call(CHANNELS.historyDelete, emptyResultSchema, input),
        onAppended: (handler) =>
            subscribe(CHANNELS.historyAppended, (push) => {
                handler(historyAppendedPushSchema.parse(push));
            }),
    };
}
