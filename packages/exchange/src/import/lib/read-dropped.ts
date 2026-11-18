import { isRecord, type InteropFile } from '@mandor/interop-core';
import { IMPORT_PROGRESS_EVERY } from '@mandor/ipc';

import { readDroppedFile } from './read-dropped-file.js';

/** What a folder holds that is never part of what the user means to import; main skips it too. */
const SKIPPED = new Set(['.git', 'node_modules']);

/** Who watches the read: the person can stop it, and hears every so many files how it goes. */
export type DropWatch = { signal: AbortSignal; onRead: (files: number) => void };

const NOBODY: DropWatch = { signal: new AbortController().signal, onRead: () => undefined };

/** The part of a drop that is read: the entries the browser can walk, and the files as a fallback. */
type DroppedTransfer = {
    files: ArrayLike<File>;
    items: ArrayLike<{ webkitGetAsEntry: () => unknown }>;
};

function isEntry(value: unknown): value is FileSystemEntry {
    return (
        isRecord(value) && typeof value['name'] === 'string' && typeof value['isFile'] === 'boolean'
    );
}

function isFile(entry: FileSystemEntry): entry is FileSystemFileEntry {
    return entry.isFile;
}

function isDirectory(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
    return entry.isDirectory;
}

function fileOf(entry: FileSystemFileEntry): Promise<File> {
    return new Promise((resolve, reject) => {
        entry.file(resolve, reject);
    });
}

function batchOf(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
    });
}

/** The reader hands the entries over in batches and answers an empty one when none is left. */
async function entriesOf(directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
    const reader = directory.createReader();
    const entries: FileSystemEntry[] = [];
    let batch = await batchOf(reader);

    while (batch.length > 0) {
        entries.push(...batch);
        batch = await batchOf(reader);
    }

    return entries;
}

/** The files found so far, each with the path it is named by; a stopped walk finds no more. */
type Walk = { signal: AbortSignal; found: { file: File; path: string }[] };

function keep(walk: Walk, file: File, path: string): void {
    walk.found.push({ file, path });
}

async function walkFolder(
    walk: Walk,
    directory: FileSystemDirectoryEntry,
    inside: string,
): Promise<void> {
    const entries = await entriesOf(directory);
    // Sorted, as main sorts a picked folder: the same folder must read the same either way.
    const kept = entries
        .filter((entry) => !SKIPPED.has(entry.name))
        .toSorted((a, b) => a.name.localeCompare(b.name));

    for (const entry of kept) {
        if (walk.signal.aborted) {
            return;
        }

        await walkEntry(walk, entry, inside);
    }
}

async function walkEntry(walk: Walk, entry: FileSystemEntry, inside: string): Promise<void> {
    const path = inside === '' ? entry.name : `${inside}/${entry.name}`;

    if (isFile(entry)) {
        keep(walk, await fileOf(entry), path);

        return;
    }

    if (isDirectory(entry)) {
        await walkFolder(walk, entry, path);
    }
}

/** A dropped folder is walked from inside, so its files are named as main names a picked one. */
async function walkDropped(walk: Walk, entries: readonly FileSystemEntry[]): Promise<void> {
    for (const entry of entries) {
        if (walk.signal.aborted) {
            return;
        }

        await (isDirectory(entry) ? walkFolder(walk, entry, '') : walkEntry(walk, entry, ''));
    }
}

/** One file at a time: thousands opened at once run the system out of file handles. */
async function readFound(walk: Walk, { signal, onRead }: DropWatch): Promise<InteropFile[] | null> {
    const files: InteropFile[] = [];

    for (const { file, path } of walk.found) {
        if (signal.aborted) {
            return null;
        }

        files.push(await readDroppedFile(file, path));

        if (files.length % IMPORT_PROGRESS_EVERY === 0) {
            onRead(files.length);
        }
    }

    return signal.aborted ? null : files;
}

/**
 * Reads what the user dropped: a file by its own name, a folder by the files inside it, each
 * named by its path under the folder. Where the browser gives no entries, the files it lists.
 * However much was dropped is read; `null` when the person stopped it.
 */
export async function readDropped(
    transfer: DroppedTransfer,
    watch: DropWatch = NOBODY,
): Promise<InteropFile[] | null> {
    // Taken before the first await: the browser empties the transfer once the handler yields.
    const entries = Array.from(transfer.items, (item) => item.webkitGetAsEntry()).filter(isEntry);
    const listed = Array.from(transfer.files);
    const walk: Walk = { signal: watch.signal, found: [] };

    if (entries.length === 0) {
        listed.forEach((file) => {
            keep(walk, file, file.name);
        });
    }

    await walkDropped(walk, entries);

    return readFound(walk, watch);
}
