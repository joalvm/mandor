import type { NetworkAccess } from '@mandor/git';

import { originSecretKey } from './origin-secret-key.js';
import { readSecret } from './secret-store.js';
import type { StoredOrigin } from './stored-origin.js';

/**
 * What git needs to talk to an origin: its address and, when the user gave one, its token. The
 * token is read from the store of the system each time and handed to git through its
 * environment; it is never kept in a variable that outlives the call.
 */
export async function originAccess(
    userDataDir: string,
    origin: StoredOrigin,
): Promise<NetworkAccess> {
    if (origin.url === undefined) {
        throw new Error(`origin ${origin.id} has no address`);
    }

    const token = await readSecret(userDataDir, originSecretKey(origin.id));

    return token === null ? { url: origin.url } : { url: origin.url, token };
}
