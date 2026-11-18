import type { AuthTokenStatus } from '@mandor/ipc';
import type { OAuth2ClientCredentials, OAuth2CodePkce } from '@mandor/schema';

import { readToken, type TokenStorage } from './token-cache.js';
import { tokenKeyOfAuth } from './token-key.js';

/** A token kept on disk outlives the app; one held in memory is valid until the app closes. */
const STATE_OF_STORAGE: Readonly<Record<TokenStorage, 'memory-only' | 'valid'>> = {
    disk: 'valid',
    memory: 'memory-only',
};

/**
 * What the window may know about the token a resolved level holds: there is one or not, it
 * still serves or not, when it stops, and whether it only lives in memory. The token itself is
 * not in the answer, and the shape has no field to put it in.
 */
export async function tokenStatusOf(
    root: string,
    auth: OAuth2ClientCredentials | OAuth2CodePkce,
    workspaceId: string,
    environmentId: string | null,
): Promise<AuthTokenStatus> {
    const cached = await readToken(root, tokenKeyOfAuth(auth, workspaceId, environmentId));

    if (cached === null) {
        return { state: 'none', expiresAt: null };
    }

    const expiresAt = new Date(cached.token.expiresAt).toISOString();

    if (cached.token.expiresAt <= Date.now()) {
        return { state: 'expired', expiresAt };
    }

    return { state: STATE_OF_STORAGE[cached.storage], expiresAt };
}
