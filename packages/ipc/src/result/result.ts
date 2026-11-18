import type { ErrorCode } from './error-code.js';

/** A call that worked. The value is domain data, already validated. */
export type Ok<T> = {
    ok: true;
    value: T;
};

/** A call that refused. `code` is what the interface decides on; `message` is for the log. */
export type Err = {
    ok: false;
    error: {
        code: ErrorCode;
        message: string;
    };
};

/**
 * The only way anything answers across the bridge. Nothing throws over IPC: the renderer
 * cannot catch a main-process exception, so every refusal travels as data.
 */
export type Result<T> = Ok<T> | Err;

/** The return of a call that has nothing to give back, like closing a socket. */
export type Empty = Record<string, never>;
