import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    connectionCreateResultSchema,
    connectionListResultSchema,
    connectionUpdateResultSchema,
    emptyResultSchema,
    type ConnectionArea,
} from '@mandor/ipc';

/** Persisted connections of the workspace: create, list, update and delete. */
export function createConnectionBridge({ call }: BridgeKit): ConnectionArea {
    return {
        create: (input) => call(CHANNELS.connectionCreate, connectionCreateResultSchema, input),
        list: (input) => call(CHANNELS.connectionList, connectionListResultSchema, input),
        update: (input) => call(CHANNELS.connectionUpdate, connectionUpdateResultSchema, input),
        delete: (input) => call(CHANNELS.connectionDelete, emptyResultSchema, input),
    };
}
