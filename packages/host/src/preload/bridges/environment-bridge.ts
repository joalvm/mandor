import {
    CHANNELS,
    environmentDefaultResultSchema,
    emptyResultSchema,
    environmentActiveLoadResultSchema,
    environmentCreateResultSchema,
    environmentListResultSchema,
    environmentUpdateResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** Environments of the workspace, plus the active one. */
export function createEnvironmentBridge(call: BridgeCall): CoreBridge['environment'] {
    return {
        create: (input) => call(CHANNELS.environmentCreate, environmentCreateResultSchema, input),
        list: (input) => call(CHANNELS.environmentList, environmentListResultSchema, input),
        update: (input) => call(CHANNELS.environmentUpdate, environmentUpdateResultSchema, input),
        delete: (input) => call(CHANNELS.environmentDelete, emptyResultSchema, input),
        loadActive: () => call(CHANNELS.environmentActiveLoad, environmentActiveLoadResultSchema),
        saveActive: (input) => call(CHANNELS.environmentActiveSave, emptyResultSchema, input),
        loadDefault: (input) =>
            call(CHANNELS.environmentDefaultLoad, environmentDefaultResultSchema, input),
        saveDefault: (input) => call(CHANNELS.environmentDefaultSave, emptyResultSchema, input),
    };
}
