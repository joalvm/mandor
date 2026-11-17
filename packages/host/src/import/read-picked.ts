import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { ImportFile } from '@mandor/ipc';

/** What a folder holds that is never part of what the user means to import. */
const SKIPPED = new Set(['.git', 'node_modules']);

/** Who watches the read: the person can stop it, and hears how many files it has read. */
export type ReadWatch = { signal: AbortSignal; onRead: (files: number) => void };

const NOBODY: ReadWatch = { signal: new AbortController().signal, onRead: () => undefined };

type Reading = ReadWatch & { read: ImportFile[] };

/**
 * Reads what the user picked into files: a file is one, named by its own name; a folder is all
 * it holds, each named by its path inside the folder with forward slashes, so a format sees the
 * same shape on every system. The text is not parsed here: which format reads it is decided
 * later, from the files. However much was picked is read, one file at a time: thousands opened at
 * once run the system out of file handles. A stopped read rejects with the reason of its signal.
 */
export async function readPicked(
    paths: readonly string[],
    watch: ReadWatch = NOBODY,
): Promise<ImportFile[]> {
    const reading: Reading = { ...watch, read: [] };

    for (const path of paths) {
        await readPath(path, reading);
    }

    return reading.read;
}

/** A path the user picked is taken as it is: the dialog of the system already resolved it. */
async function readPath(path: string, reading: Reading): Promise<void> {
    const info = await stat(path);

    if (info.isDirectory()) {
        await readFolder(path, '', reading);

        return;
    }

    await keepFile(basename(path), path, reading);
}

async function readFolder(folder: string, inside: string, reading: Reading): Promise<void> {
    const entries = await readdir(join(folder, inside), { withFileTypes: true });
    // Sorted: the disk lists in its own order, and the same folder must read the same everywhere.
    const kept = entries
        .filter((entry) => !SKIPPED.has(entry.name))
        .toSorted((a, b) => a.name.localeCompare(b.name));

    for (const entry of kept) {
        reading.signal.throwIfAborted();
        await readEntry(folder, inside, entry, reading);
    }
}

/**
 * Inside a folder only folders and plain files count. A link is not followed: a folder from
 * somebody else can point at a key of this user, and the import would carry it into a
 * workspace that syncs. A socket, a pipe or a device is no text to read.
 */
async function readEntry(
    folder: string,
    inside: string,
    entry: Dirent,
    reading: Reading,
): Promise<void> {
    const relative = inside === '' ? entry.name : `${inside}/${entry.name}`;

    if (entry.isDirectory()) {
        await readFolder(folder, relative, reading);

        return;
    }

    if (entry.isFile()) {
        await keepFile(relative, join(folder, relative), reading);
    }
}

async function keepFile(path: string, absolute: string, reading: Reading): Promise<void> {
    const { signal, read, onRead } = reading;

    read.push({ path, text: await readFile(absolute, { encoding: 'utf8', signal }) });
    onRead(read.length);
}
