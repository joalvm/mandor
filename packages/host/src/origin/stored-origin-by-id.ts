import { failure, success, type Result } from '@mandor/ipc';

import { listOrigins } from './origins.js';
import type { StoredOrigin } from './stored-origin.js';

/** The origin the list keeps under an id, or the refusal of a request that names one it lacks. */
export async function storedOriginById(
    userDataDir: string,
    id: string,
): Promise<Result<StoredOrigin>> {
    const stored = await listOrigins(userDataDir);
    const origin = stored.find((each) => each.id === id);

    return origin === undefined ? failure('bad-request', `unknown origin: ${id}`) : success(origin);
}
