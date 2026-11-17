import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    emptyResultSchema,
    type WsArea,
    wsActivityPushSchema,
    wsScriptNoteSchema,
    wsStatePushSchema,
} from '@mandor/ipc';

/**
 * The open socket of a connection: open, send, close. State and activity arrive as pushes,
 * validated at this edge; a push that does not parse is a bug in main, louder thrown.
 */
export function createWsBridge({ call, subscribe }: BridgeKit): WsArea {
    return {
        open: (input) => call(CHANNELS.wsOpen, emptyResultSchema, input),
        send: (input) => call(CHANNELS.wsSend, emptyResultSchema, input),
        close: (input) => call(CHANNELS.wsClose, emptyResultSchema, input),
        retryNow: (input) => call(CHANNELS.wsRetryNow, emptyResultSchema, input),
        onState: (handler) =>
            subscribe(CHANNELS.wsState, (push) => {
                handler(wsStatePushSchema.parse(push));
            }),
        onActivity: (handler) =>
            subscribe(CHANNELS.wsActivity, (push) => {
                handler(wsActivityPushSchema.parse(push));
            }),
        onScriptNote: (handler) =>
            subscribe(CHANNELS.wsScriptNote, (note) => {
                handler(wsScriptNoteSchema.parse(note));
            }),
    };
}
