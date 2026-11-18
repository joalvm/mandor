import { stat } from 'node:fs/promises';

import { GitError } from '@mandor/git';

import { cloneOrigin } from './clone-origin.js';
import { originAccess } from './origin-access.js';
import { OriginUnreachableError } from './origin-unreachable-error.js';
import type { StoredOrigin } from './stored-origin.js';

/**
 * A remote origin with no working copy on this machine gets its work brought down. Local has
 * its copy from the start, and an origin already cloned is left as it is. A clone that git
 * could not finish is an origin that did not answer, whatever git said about it.
 */
export async function ensureOriginCopy(userDataDir: string, origin: StoredOrigin): Promise<void> {
    if (origin.kind === 'local' || (await exists(origin.root))) {
        return;
    }

    const access = await originAccess(userDataDir, origin);

    try {
        await cloneOrigin(origin, access);
    } catch (error) {
        if (error instanceof GitError) {
            throw new OriginUnreachableError(error.detail);
        }

        throw error;
    }
}

function exists(path: string): Promise<boolean> {
    return stat(path).then(
        () => true,
        () => false,
    );
}
