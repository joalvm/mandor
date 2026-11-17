import {
    CHANNELS,
    collectionChainResultSchema,
    collectionCreateResultSchema,
    collectionReadItemResultSchema,
    collectionSearchResultSchema,
    collectionTreeResultSchema,
    emptyResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** The tree of the workspace: move, reorder, rename, create, delete, read, write and search. */
export function createCollectionsBridge(call: BridgeCall): CoreBridge['collections'] {
    return {
        tree: (input) => call(CHANNELS.collectionTree, collectionTreeResultSchema, input),
        move: (input) => call(CHANNELS.collectionMove, emptyResultSchema, input),
        reorder: (input) => call(CHANNELS.collectionReorder, emptyResultSchema, input),
        renameFolder: (input) => call(CHANNELS.collectionRenameFolder, emptyResultSchema, input),
        renameItem: (input) => call(CHANNELS.collectionRenameItem, emptyResultSchema, input),
        create: (input) => call(CHANNELS.collectionCreate, collectionCreateResultSchema, input),
        delete: (input) => call(CHANNELS.collectionDelete, emptyResultSchema, input),
        readItem: (input) =>
            call(CHANNELS.collectionReadItem, collectionReadItemResultSchema, input),
        writeItem: (input) => call(CHANNELS.collectionWriteItem, emptyResultSchema, input),
        search: (input) => call(CHANNELS.collectionSearch, collectionSearchResultSchema, input),
        chain: (input) => call(CHANNELS.collectionChain, collectionChainResultSchema, input),
        writeSettings: (input) => call(CHANNELS.collectionSettingsWrite, emptyResultSchema, input),
    };
}
