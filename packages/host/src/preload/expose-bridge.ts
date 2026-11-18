import { contextBridge, ipcRenderer } from 'electron';

import type { CoreBridge } from '@mandor/ipc';

import { bridgeKitOf, type BridgeKit } from './bridge-kit.js';
import { createCoreBridge } from './create-bridge.js';

/** What an app makes of the core before it crosses: the core as it is, or the core and more. */
type ExtendBridge = (core: CoreBridge, kit: BridgeKit) => CoreBridge;

/**
 * The preload of each app calls this once, and it is not in the barrel for that reason: the
 * build of each app points its `preload` at a file that calls it, and nothing else ever does.
 *
 * One name lands in the world of the renderer and nothing else does. No `require`, no `process`,
 * no utility "for debugging": each of those is a way back into node from a page, and a page is
 * the part of Mandor a stranger can reach. `ipcRenderer` itself never crosses either — what
 * crosses is a closed set of functions that each know one channel, the core's and the app's.
 */
export function exposeBridge(extend: ExtendBridge = (core) => core): void {
    contextBridge.exposeInMainWorld(
        'mandor',
        extend(createCoreBridge(ipcRenderer), bridgeKitOf(ipcRenderer)),
    );
}
