import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { readTextOrNull } from '@mandor/store-fs';

import { rememberGone, rememberText } from './known-texts.js';

/**
 * Takes the disk as the window's belief for each path a change of structure left behind: a
 * file by its text, a folder by every file in it, a path that is not there as gone. What the
 * app itself did is not news to the window, and this is how the watcher tells it apart from an
 * edit made elsewhere. A path that cannot be read is left as it was: the worst that follows is
 * a reload nobody needed.
 */
export async function rememberDisk(root: string, paths: string[]): Promise<void> {
    for (const path of paths) {
        await rememberPath(root, path).catch(() => undefined);
    }
}

async function rememberPath(root: string, path: string): Promise<void> {
    const found = await stat(join(root, path)).catch(() => null);

    if (found === null) {
        rememberGone(root, path);

        return;
    }

    if (found.isDirectory()) {
        await rememberFolder(root, path);

        return;
    }

    rememberText(root, path, await readTextOrNull(join(root, path)));
}

async function rememberFolder(root: string, path: string): Promise<void> {
    const entries = await readdir(join(root, path), { withFileTypes: true });

    for (const entry of entries) {
        await rememberPath(root, `${path}/${entry.name}`).catch(() => undefined);
    }
}
