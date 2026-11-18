import type { AuthReadRequest, PlaceAuth } from '../auth/auth-read.js';
import type { AuthTokenFetchRequest } from '../auth/auth-token-fetch.js';
import type { AuthTokenForgetRequest } from '../auth/auth-token-forget.js';
import type { AuthTokenRequest, AuthTokenStatus } from '../auth/auth-token-status.js';
import type { AuthWriteRequest } from '../auth/auth-write.js';
import type { Empty, Result } from '../result/result.js';

/**
 * The auth of the active origin, read and written per level of the chain. Main knows the
 * directory; the renderer asks with workspace ids and collection paths, and never with one.
 */
export type AuthArea = {
    /** The auth one place carries right now, or null when the file says nothing. */
    read: (input: AuthReadRequest) => Promise<Result<PlaceAuth>>;
    /** Writes one level; null takes the key out so the level inherits again. */
    write: (input: AuthWriteRequest) => Promise<Result<Empty>>;
    /** What the window may know about the token of a level: never the token. */
    tokenStatus: (input: AuthTokenRequest) => Promise<Result<AuthTokenStatus>>;
    /** Gets a new token, and the browser opens when the level is a code flow. */
    tokenFetch: (input: AuthTokenFetchRequest) => Promise<Result<AuthTokenStatus>>;
    /** Throws the token of the level away; the next send asks for another. */
    tokenForget: (input: AuthTokenForgetRequest) => Promise<Result<Empty>>;
};
