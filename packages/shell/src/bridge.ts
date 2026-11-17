import type { CoreBridge } from '@mandor/ipc';

declare global {
    // Window augmentation requires declaration merging.
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Window {
        mandor: CoreBridge;
    }
}

/** The renderer's only access to the preload surface. */
export const bridge = window.mandor;
