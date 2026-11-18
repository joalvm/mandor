import {
    CHANNELS,
    emptyResultSchema,
    workspaceCreateResultSchema,
    workspaceListResultSchema,
    workspaceRenameResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** Create, list, rename and delete the workspaces of the active origin. */
export function createWorkspaceBridge(call: BridgeCall): CoreBridge['workspace'] {
    return {
        create: (input) => call(CHANNELS.workspaceCreate, workspaceCreateResultSchema, input),
        delete: (input) => call(CHANNELS.workspaceDelete, emptyResultSchema, input),
        list: () => call(CHANNELS.workspaceList, workspaceListResultSchema),
        rename: (input) => call(CHANNELS.workspaceRename, workspaceRenameResultSchema, input),
    };
}
