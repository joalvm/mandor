import type { Channel } from '@mandor/ipc';

/**
 * The slice of `ipcRenderer` the bridge uses, named structurally. Nothing here knows it is
 * Electron, so the whole surface can be exercised in a plain node test.
 */
export type BridgeIpc = {
    invoke: (channel: Channel, payload?: unknown) => Promise<unknown>;
    on: (channel: Channel, listener: (event: unknown, push: unknown) => void) => void;
    removeListener: (channel: Channel, listener: (event: unknown, push: unknown) => void) => void;
};
