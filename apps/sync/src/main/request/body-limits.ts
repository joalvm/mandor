import { BODY_WINDOW_BYTES } from '@mandor/ipc';

/** A response body past this stays on disk: the renderer holds a reference, never the bytes. */
export const SPILL_BYTES = 1_048_576;

/** The most one window of a stored body carries: the contract's, named where main reads it. */
export const WINDOW_BYTES = BODY_WINDOW_BYTES;
