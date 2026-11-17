import { bridge as coreBridge } from '@mandor/shell';

import type { SyncBridge } from '../../preload/sync-bridge.js';

/**
 * The one reading of the bridge in the renderer of Sync. The window is read once, by the shell,
 * as the core every app has; the preload of Sync added its request area to that same object, and
 * this is the one place that says so.
 */
export const syncBridge = coreBridge as SyncBridge;
