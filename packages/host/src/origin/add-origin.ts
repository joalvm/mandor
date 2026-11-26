import { dirname, join } from 'node:path';

import { createOrigin, newId, splitOriginUrl } from '@mandor/schema';

import { defaultRepoRoot } from '../repo/default-repo-root.js';

import { originSecretKey } from './origin-secret-key.js';
import { rememberOrigin } from './origins.js';
import { storeSecret } from './secret-store.js';
import type { StoredOrigin } from './stored-origin.js';

export type AddOriginDeps = {
    repoFolder: string;
    userDataDir: string;
};

export type AddOriginInput = {
    name: string;
    url: string;
};

/**
 * Records an origin the user named. The url is split first: a token embedded in it goes to the
 * store of the system under the id of the origin, and only the clean url is written to disk.
 */
export async function addOrigin(deps: AddOriginDeps, input: AddOriginInput): Promise<StoredOrigin> {
    const split = splitOriginUrl(input.url);
    const origin = createOrigin({ id: newId(), name: input.name, url: split.url });
    const stored: StoredOrigin = { ...origin, root: originDir(deps.repoFolder, origin.id) };

    if (split.token !== undefined) {
        await storeSecret(deps.userDataDir, originSecretKey(origin.id), split.token);
    }

    await rememberOrigin(deps.userDataDir, stored);

    return stored;
}

/**
 * The working copy of an origin is a sibling of the local one: the container of the app holds
 * repos, and a copy of an origin is never nested inside another repo.
 */
function originDir(repoFolder: string, id: string): string {
    return join(dirname(defaultRepoRoot(repoFolder)), id);
}
