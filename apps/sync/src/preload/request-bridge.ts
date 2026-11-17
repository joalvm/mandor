import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    requestBodyReadResultSchema,
    requestBodySaveResultSchema,
    emptyResultSchema,
    requestScriptOutputSchema,
    requestSendResultSchema,
    type RequestArea,
} from '@mandor/ipc';

/**
 * Sends a request, reads what came back and hears what its scripts said. Every answer and push is
 * validated at this edge, like those of the other areas: one out of contract is a bug in main,
 * louder thrown than shown.
 */
export function createRequestBridge({ call, subscribe }: BridgeKit): RequestArea {
    return {
        send: (input) => call(CHANNELS.requestSend, requestSendResultSchema, input),
        cancel: (input) => call(CHANNELS.requestCancel, emptyResultSchema, input),
        readBody: (input) => call(CHANNELS.requestBodyRead, requestBodyReadResultSchema, input),
        saveBody: (input) => call(CHANNELS.requestBodySave, requestBodySaveResultSchema, input),
        hideSecrets: (input) => call(CHANNELS.requestHideSecrets, requestSendResultSchema, input),
        onScriptOutput: (handler) =>
            subscribe(CHANNELS.requestScriptOutput, (push) => {
                handler(requestScriptOutputSchema.parse(push));
            }),
    };
}
