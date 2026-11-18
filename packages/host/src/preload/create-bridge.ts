import type { CoreBridge } from '@mandor/ipc';

import { createBridgeCall } from './bridge-call.js';
import type { BridgeIpc } from './bridge-ipc.js';
import { createAppBridge } from './bridges/app-bridge.js';
import { createConflictBridge } from './bridges/conflict-bridge.js';
import { createCollectionsBridge } from './bridges/collections-bridge.js';
import { createAuthBridge } from './bridges/auth-bridge.js';
import { createGlobalsBridge } from './bridges/globals-bridge.js';
import { createDocBridge } from './bridges/doc-bridge.js';
import { createEnvironmentBridge } from './bridges/environment-bridge.js';
import { createImportBridge } from './bridges/import-bridge.js';
import { createExportBridge } from './bridges/export-bridge.js';
import { createLogBridge } from './bridges/log-bridge.js';
import { createNetworkBridge } from './bridges/network-bridge.js';
import { createScriptsBridge } from './bridges/scripts-bridge.js';
import { createNoticeBridge } from './bridges/notice-bridge.js';
import { createMenuBridge } from './bridges/menu-bridge.js';
import { createOriginBridge } from './bridges/origin-bridge.js';
import { createSecretBridge } from './bridges/secret-bridge.js';
import { createSessionBridge } from './bridges/session-bridge.js';
import { createRepoBridge } from './bridges/repo-bridge.js';
import { createUpdateBridge } from './bridges/update-bridge.js';
import { createWindowBridge } from './bridges/window-bridge.js';
import { createWorkspaceBridge } from './bridges/workspace-bridge.js';

/**
 * What the host serves to the window of every app, and nothing else: an app that serves more
 * adds its own areas in its preload. The object is annotated as `CoreBridge`, so dropping a
 * method or misspelling a payload stops the build instead of failing at runtime in a window
 * nobody is watching. Each key is one file under `bridges/`, and adding a key is adding a file
 * and a line here.
 *
 * Each call is one `invoke` and no more: main validates every request against the schema of its
 * channel, which is where a payload written by a renderer has to be doubted. What arrives the
 * other way is validated too, at the edge where the schema of the channel exists.
 */
export function createCoreBridge(ipc: BridgeIpc): CoreBridge {
    const call = createBridgeCall(ipc);

    return {
        origin: createOriginBridge(call, ipc),
        workspace: createWorkspaceBridge(call),
        auth: createAuthBridge(call),
        globals: createGlobalsBridge(call),
        collections: createCollectionsBridge(call),
        import: createImportBridge(call, ipc),
        environment: createEnvironmentBridge(call),
        secret: createSecretBridge(call),
        export: createExportBridge(call),
        doc: createDocBridge(call),
        session: createSessionBridge(call),
        menu: createMenuBridge(call, ipc),
        window: createWindowBridge(call, ipc),
        app: createAppBridge(call),
        repo: createRepoBridge(ipc),
        conflict: createConflictBridge(call, ipc),
        notice: createNoticeBridge(call, ipc),
        network: createNetworkBridge(call),
        scripts: createScriptsBridge(call),
        update: createUpdateBridge(call, ipc),
        log: createLogBridge(call),
    };
}
