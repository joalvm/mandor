import { bridge as coreBridge } from '@mandor/shell';

import type { AsyncBridge } from '../../preload/async-bridge.js';

/**
 * The one reading of the bridge in the renderer of Async. The window is read once, by the shell,
 * as the core every app has; the preload of Async added its own areas to that same object, and
 * this is the one place that says so.
 */
export const asyncBridge = coreBridge as AsyncBridge;
