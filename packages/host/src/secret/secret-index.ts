import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { mandorDir, atomicWrite, inTurn, readTextOrNull } from '@mandor/store-fs';

/** Which secrets have a value here. Never a value, and never anything git could carry away. */
const FILE = 'secret-index.json';

/**
 * The path of the index. It sits in the private directory of the repo, which is ignored from
 * the first commit on: the index says what this machine holds, and that is nobody else's.
 */
export function secretIndexFile(root: string): string {
    return join(mandorDir(root), FILE);
}

/**
 * The keys that have a value on this machine.
 *
 * Without it, the only way to tell a declared and empty secret from one that is filled in is
 * to ask for the value, which is exactly the question this plan refuses to answer.
 */
export async function readSecretIndex(root: string): Promise<string[]> {
    // Missing is empty; unreadable fails, or the next key remembered would be the only one.
    const source = (await readTextOrNull(secretIndexFile(root))) ?? '';

    try {
        const parsed: unknown = JSON.parse(source);

        return keysOf(parsed);
    } catch {
        return [];
    }
}

/**
 * Writes down that this key has a value here. Writing it twice leaves one entry. The index is
 * read and written whole, so each change waits for the one before it to land.
 */
export function rememberSecret(root: string, key: string): Promise<void> {
    return inTurn(secretIndexFile(root), async () => {
        const keys = await readSecretIndex(root);

        if (keys.includes(key)) {
            return;
        }

        await write(root, [...keys, key].sort());
    });
}

/** Writes down that this key has no value here any more, in turn with every other change. */
export function forgetSecret(root: string, key: string): Promise<void> {
    return inTurn(secretIndexFile(root), async () => {
        const keys = await readSecretIndex(root);

        if (!keys.includes(key)) {
            return;
        }

        await write(
            root,
            keys.filter((each) => each !== key),
        );
    });
}

async function write(root: string, keys: string[]): Promise<void> {
    await mkdir(mandorDir(root), { recursive: true });
    await atomicWrite(secretIndexFile(root), JSON.stringify({ keys }, null, 4));
}

/** An index that does not parse is worth nothing: this machine is treated as holding none. */
function keysOf(parsed: unknown): string[] {
    if (typeof parsed !== 'object' || parsed === null || !('keys' in parsed)) {
        return [];
    }

    const keys: unknown = parsed.keys;

    if (!Array.isArray(keys)) {
        return [];
    }

    return keys.filter((key): key is string => typeof key === 'string');
}
