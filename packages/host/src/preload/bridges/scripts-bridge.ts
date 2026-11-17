import {
    CHANNELS,
    emptyResultSchema,
    scriptsApproveResultSchema,
    scriptsStatusResultSchema,
    scriptsSwitchReadResultSchema,
    type CoreBridge,
} from '@mandor/ipc';

import type { BridgeCall } from '../bridge-call.js';

/** The scripts of this machine: approve, ask which are approved, forget, the switch, the values. */
export function createScriptsBridge(call: BridgeCall): CoreBridge['scripts'] {
    return {
        approve: (request) => call(CHANNELS.scriptsApprove, scriptsApproveResultSchema, request),
        status: (request) => call(CHANNELS.scriptsStatus, scriptsStatusResultSchema, request),
        forget: () => call(CHANNELS.scriptsForget, emptyResultSchema),
        readSwitch: () => call(CHANNELS.scriptsSwitchRead, scriptsSwitchReadResultSchema),
        writeSwitch: (enabled) => call(CHANNELS.scriptsSwitchWrite, emptyResultSchema, { enabled }),
        clearVariables: (workspaceId) =>
            call(CHANNELS.scriptsClearVariables, emptyResultSchema, { workspaceId }),
    };
}
