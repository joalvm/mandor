import { join } from 'node:path';

import { LOCAL_ORIGIN_ID } from '@mandor/schema';
import { atomicWrite, inTurn, readTextOrNull } from '@mandor/store-fs';

import { storedOriginListSchema, type StoredOrigin } from './stored-origin.js';

/**
 * The origins this machine knows. It names directories of this machine, so it lives in the
 * directory of the app and never inside a repo: a repo is shared, and these paths are not.
 */
const FILE = 'origins.json';

/**
 * Reads the list, most recently used first. It is rebuilt every time an origin is added or
 * chosen, so a file that is missing or no longer shaped like a list is worth no more than an
 * empty answer: losing it costs the user one choice. A file that is there and cannot be read
 * fails instead, because the next origin remembered would rewrite it without the others.
 */
export async function listOrigins(userDataDir: string): Promise<StoredOrigin[]> {
    const source = (await readTextOrNull(join(userDataDir, FILE))) ?? '';
    const listed = storedOriginListSchema.safeParse(parsed(source));

    if (!listed.success) {
        return [];
    }

    return listed.data;
}

/**
 * Records an origin, once. The same id opened again keeps one entry, with the name it has now.
 *
 * `Local` is always the head of the list: it is the ground the app stands on, and the window
 * starts from the head. Every other origin is ordered by recency behind it.
 */
export function rememberOrigin(userDataDir: string, origin: StoredOrigin): Promise<void> {
    return inTurn(join(userDataDir, FILE), async () => {
        const others = (await listOrigins(userDataDir)).filter((each) => each.id !== origin.id);
        const local = others.find((each) => each.id === LOCAL_ORIGIN_ID);
        const rest = others.filter((each) => each.id !== LOCAL_ORIGIN_ID);
        const ordered =
            origin.id === LOCAL_ORIGIN_ID
                ? [origin, ...rest]
                : [...(local === undefined ? [] : [local]), origin, ...rest];

        await write(userDataDir, ordered);
    });
}

/**
 * Takes an origin off the list for good; whoever calls it owns what happens to the copy. The list
 * is read and written whole, so each change waits for the one before it to land.
 */
export function forgetOrigin(userDataDir: string, id: string): Promise<void> {
    return inTurn(join(userDataDir, FILE), async () => {
        const kept = (await listOrigins(userDataDir)).filter((each) => each.id !== id);

        await write(userDataDir, kept);
    });
}

async function write(userDataDir: string, origins: readonly StoredOrigin[]): Promise<void> {
    await atomicWrite(join(userDataDir, FILE), JSON.stringify(origins, null, 4));
}

function parsed(source: string): unknown {
    try {
        return JSON.parse(source);
    } catch {
        return null;
    }
}
