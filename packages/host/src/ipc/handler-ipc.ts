import type { Channel } from '@mandor/ipc';

/**
 * What a handler of main is: the payload arrives as `unknown` because it was written by a
 * renderer, and the answer is always data. Nothing throws across the bridge, so a refusal
 * comes back as a `Result` and never as an exception the renderer could not catch.
 */
export type IpcListener = (event: unknown, payload: unknown) => Promise<unknown>;

/**
 * The slice of `ipcMain` the handlers register on, named structurally. Nothing here knows it
 * is Electron, so a whole set of handlers can be exercised in a plain node test.
 */
export type HandlerIpc = {
    handle: (channel: Channel, listener: IpcListener) => void;
    removeHandler: (channel: Channel) => void;
};
