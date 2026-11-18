import type { ErrorCode } from '@mandor/ipc';

/**
 * A token that did not come: the server refused, the endpoint is not one to trust, or the
 * person stopped the flow. The message is for the log; the code is what the interface decides on.
 */
export class AuthTokenError extends Error {
    /** The refusals a token flow can end in: each one a code the interface has a text for. */
    readonly code: Extract<ErrorCode, 'auth-token-failed' | 'auth-cancelled'>;

    constructor(code: AuthTokenError['code'], detail: string) {
        super(detail);
        this.name = 'AuthTokenError';
        this.code = code;
    }
}
