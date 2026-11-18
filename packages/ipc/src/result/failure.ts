import type { ErrorCode } from './error-code.js';
import type { Err } from './result.js';

/** Builds the refusal. `message` never reaches the screen; the UI translates the code. */
export function failure(code: ErrorCode, message: string): Err {
    return { ok: false, error: { code, message } };
}
