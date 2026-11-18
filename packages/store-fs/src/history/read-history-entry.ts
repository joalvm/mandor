import { join } from 'node:path';

import { type HistoryEntry, historyEntrySchema } from '@mandor/schema';

import { namesOrNone } from '../disk/directory-entries.js';
import { FileReadError } from '../disk/file-read-error.js';
import type { LoadWarning } from '../disk/load-warning.js';
import { readFileText } from '../disk/read-file-text.js';
import { assertHistoryId, historyDir } from './history-path.js';

export type HistoryRead = { ok: true; entry: HistoryEntry } | { ok: false; warning: LoadWarning };

function entryIn(source: string): HistoryEntry {
    const contents: unknown = JSON.parse(source);

    return historyEntrySchema.parse(contents);
}

/** Reads one entry file. One that cannot be read or parsed is a warning, never a throw. */
export async function readHistoryFile(path: string): Promise<HistoryRead> {
    try {
        return { ok: true, entry: entryIn(await readFileText(path)) };
    } catch (error) {
        return { ok: false, warning: { path, message: String(error) } };
    }
}

/**
 * The entry of one file when its text spells one of these words, and none otherwise: a file that
 * spells none is let go unparsed. One that cannot be read or parsed names nothing, as in a list.
 */
export async function readHistoryFileSpelling(
    path: string,
    words: readonly string[],
): Promise<HistoryEntry[]> {
    try {
        const source = await readFileText(path);

        return words.some((word) => source.includes(word)) ? [entryIn(source)] : [];
    } catch {
        return [];
    }
}

/**
 * Reads the entry of one send by id. The time in the file name is not known to the caller, so
 * the folder is searched for the name that ends in the id; a missing entry is a refusal.
 */
export async function readHistoryEntry(
    root: string,
    workspaceId: string,
    id: string,
): Promise<HistoryEntry> {
    assertHistoryId(id);

    const dir = historyDir(root, workspaceId);
    const names = await namesOrNone(dir);
    const name = names.find((each) => each.endsWith(`-${id}.json`));

    if (name === undefined) {
        throw new FileReadError({ path: join(dir, `*-${id}.json`), message: 'not found' });
    }

    const read = await readHistoryFile(join(dir, name));

    if (!read.ok) {
        throw new FileReadError(read.warning);
    }

    return read.entry;
}
