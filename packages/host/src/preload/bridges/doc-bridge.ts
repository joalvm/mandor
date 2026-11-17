import {
    CHANNELS,
    docCreateResultSchema,
    docListResultSchema,
    docReadResultSchema,
    docRevertResultSchema,
    emptyResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** Markdown docs of the workspace: create, delete, list, read, rename, write and revert. */
export function createDocBridge(call: BridgeCall): CoreBridge['doc'] {
    return {
        create: (input) => call(CHANNELS.docCreate, docCreateResultSchema, input),
        delete: (input) => call(CHANNELS.docDelete, emptyResultSchema, input),
        list: (input) => call(CHANNELS.docList, docListResultSchema, input),
        read: (input) => call(CHANNELS.docRead, docReadResultSchema, input),
        rename: (input) => call(CHANNELS.docRename, emptyResultSchema, input),
        write: (input) => call(CHANNELS.docWrite, emptyResultSchema, input),
        revert: (input) => call(CHANNELS.docRevert, docRevertResultSchema, input),
    };
}
