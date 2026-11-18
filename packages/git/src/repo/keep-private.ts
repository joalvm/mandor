import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { run } from '../git/run.js';
import { commitIn } from './ensure-identity.js';
import { pathsOf } from './paths-of.js';
import { PRIVATE_DIR } from './private-dir.js';

// Git takes ignored files for expendable: a commit of the origin that carries a private file
// writes it over the one on disk when the branch moves, and one that drops it deletes it. The
// private directory holds the session of this machine, so what it holds is read before a move
// and put back after.

/** What this copy holds at each private path the origin changed: its bytes, or null for none. */
export type PrivateAside = ReadonlyMap<string, Buffer | null>;

function isMissing(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** The bytes of a file, or null when there is none. Anything else unreadable stops the move. */
async function heldAt(file: string): Promise<Buffer | null> {
    try {
        return await readFile(file);
    } catch (error) {
        if (isMissing(error)) {
            return null;
        }

        throw error;
    }
}

/**
 * Reads what this copy holds at every private path the origin changed since the two parted,
 * before anything moves.
 */
export async function setPrivateAside(root: string): Promise<PrivateAside> {
    const changed = await run(
        ['diff', '--name-only', '--no-renames', '-z', 'HEAD...@{u}', '--', PRIVATE_DIR],
        root,
    );
    const aside = new Map<string, Buffer | null>();

    for (const path of pathsOf(changed)) {
        aside.set(path, await heldAt(join(root, path)));
    }

    return aside;
}

/** Puts back what this copy held, and takes away what the origin laid where it held nothing. */
export async function restorePrivate(root: string, aside: PrivateAside): Promise<void> {
    for (const [path, bytes] of aside) {
        const file = join(root, path);

        if (bytes === null) {
            await rm(file, { force: true });
        } else {
            await mkdir(dirname(file), { recursive: true });
            await writeFile(file, bytes);
        }
    }
}

/**
 * Takes the private files a move brought out of the index, in one commit; the copies on disk
 * stay. Answers whether there was anything to take out.
 */
export async function untrackPrivate(root: string, message: string): Promise<boolean> {
    await run(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', PRIVATE_DIR], root);

    if ((await run(['diff', '--cached', '--name-only'], root)) === '') {
        return false;
    }

    await commitIn(root, ['-m', message]);

    return true;
}
