import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    emptyResultSchema,
    recordPickResultSchema,
    recordStatePushSchema,
    recordStatusResultSchema,
    recordStopResultSchema,
    type RecordArea,
} from '@mandor/ipc';

/**
 * The recording of one connection: pick the file, start, stop, and the state that tells the
 * bar of the connection what the file holds. The state arrives as a push, validated at this
 * edge like every push; a recording answers for the file on disk, and the window only reads.
 */
export function createRecordBridge({ call, subscribe }: BridgeKit): RecordArea {
    return {
        pick: (input) => call(CHANNELS.recordPick, recordPickResultSchema, input),
        start: (input) => call(CHANNELS.recordStart, emptyResultSchema, input),
        stop: (input) => call(CHANNELS.recordStop, recordStopResultSchema, input),
        status: (input) => call(CHANNELS.recordStatus, recordStatusResultSchema, input),
        reveal: (input) => call(CHANNELS.recordReveal, emptyResultSchema, input),
        onState: (handler) =>
            subscribe(CHANNELS.recordState, (push) => {
                handler(recordStatePushSchema.parse(push));
            }),
    };
}
