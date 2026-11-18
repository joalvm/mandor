import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { RepoFileError } from './repo-file-error.js';

/**
 * The folders of the repo that belong to the app and not to the work: history, whose settings
 * may hold a token in the address it syncs with, and what never leaves the machine. Compared
 * without case, since a disk that ignores it reads `.GIT` as `.git`.
 */
const APP_FOLDERS = ['.git', '.mandor'];

/** Whether `target` lives under `root`, once both are written the same way. */
function inside(root: string, target: string): boolean {
    const path = relative(root, target);

    return path !== '' && !path.startsWith('..') && !isAbsolute(path);
}

/** Whether `target` lives under `root` and outside the folders of the app. */
function servable(root: string, target: string): boolean {
    const first = relative(root, target).split(sep)[0]?.toLowerCase() ?? '';

    return inside(root, target) && !APP_FOLDERS.includes(first);
}

/**
 * Reads a file of the repo a request names. The schema already refuses a path that climbs out,
 * but the renderer is what a stranger reaches, so main checks again against the real path: a
 * link inside the repo that leads outside of it is refused too. A collection someone shares can
 * name any file as a body and send it where they choose, so the folders of the app are refused
 * the same way, by name or through a link.
 */
export async function readRepoFile(root: string, path: string): Promise<Uint8Array> {
    const candidate = resolve(root, path);

    if (isAbsolute(path) || !servable(resolve(root), candidate)) {
        throw new RepoFileError('the file of the body is outside what a request may send');
    }

    try {
        const real = await realpath(candidate);

        if (!servable(await realpath(root), real)) {
            throw new RepoFileError('the file of the body is outside what a request may send');
        }

        return await readFile(real);
    } catch (error) {
        if (error instanceof RepoFileError) {
            throw error;
        }

        throw new RepoFileError('the file of the body cannot be read');
    }
}
