import type { TokenEndpointResponse } from 'oauth4webapi';

/** What a flow keeps of a token endpoint response: the token, how long it lives, how to renew. */
export type StoredToken = {
    accessToken: string;
    refreshToken?: string | undefined;
    /** Epoch milliseconds. */
    expiresAt: number;
};

/** A server that does not say how long its token lives is supposed to mean an hour. */
const UNKNOWN_LIFETIME_MS = 3_600_000;

/**
 * Reads a token endpoint response. A server that rotates the refresh token hands the new one
 * over; one that does not leaves the previous one valid, so it is kept.
 */
export function storedTokenOf(
    response: TokenEndpointResponse,
    now: number,
    previousRefreshToken?: string,
): StoredToken {
    const lifetimeMs =
        response.expires_in === undefined ? UNKNOWN_LIFETIME_MS : response.expires_in * 1000;
    const refreshToken = response.refresh_token ?? previousRefreshToken;

    return {
        accessToken: response.access_token,
        ...(refreshToken === undefined ? {} : { refreshToken }),
        expiresAt: now + lifetimeMs,
    };
}
