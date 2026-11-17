import { SEGMENT, type HistoryEntry } from '@mandor/schema';

import { entriesOrNone, namesOrNone } from '../disk/directory-entries.js';
import type { LoadWarning } from '../disk/load-warning.js';
import { historiesDir, historyDir, historyEntryFile, isHistoryFileName } from './history-path.js';
import { readHistoryFile, readHistoryFileSpelling } from './read-history-entry.js';

export type ListedHistory = {
    entries: HistoryEntry[];
    warnings: LoadWarning[];
};

/**
 * The files of the entries of a workspace, newest first. The name starts with the compact time of
 * the send, so sorting names backwards is sorting sends backwards without opening anything.
 */
export async function historyFileNames(root: string, workspaceId: string): Promise<string[]> {
    const names = await namesOrNone(historyDir(root, workspaceId));

    return names.filter(isHistoryFileName).sort().reverse();
}

/** Reads these files of the history, in the order given; one that does not parse is a warning. */
export async function readHistoryFiles(
    root: string,
    workspaceId: string,
    names: readonly string[],
): Promise<ListedHistory> {
    const paths = names.map((name) => historyEntryFile(root, workspaceId, name));
    const reads = await Promise.all(paths.map(readHistoryFile));

    return {
        entries: reads.filter((read) => read.ok).map((read) => read.entry),
        warnings: reads.filter((read) => !read.ok).map((read) => read.warning),
    };
}

/**
 * The entries of a workspace whose file spells one of these words, such as the refs of bodies
 * about to go. Every file is read, but only those that spell a word are parsed and kept: asking
 * whether a body is still named holds a few entries, not the whole history, at once.
 */
export async function historySpelling(
    root: string,
    workspaceId: string,
    words: readonly string[],
): Promise<HistoryEntry[]> {
    if (words.length === 0) {
        return [];
    }

    const names = await historyFileNames(root, workspaceId);
    const paths = names.map((name) => historyEntryFile(root, workspaceId, name));
    const found = await Promise.all(paths.map((path) => readHistoryFileSpelling(path, words)));

    return found.flat();
}

/**
 * Every entry of a workspace, newest first, each turned into what `shape` keeps of it as soon as
 * it is read. A list of 500 sends with their bodies in line held them all at once, up to 64 MiB,
 * to show a row of each: here an entry lives only until it is shaped. One that does not parse is
 * left out.
 */
export async function shapeHistory<T>(
    root: string,
    workspaceId: string,
    shape: (entry: HistoryEntry) => T,
): Promise<T[]> {
    const names = await historyFileNames(root, workspaceId);
    const shaped = await Promise.all(
        names.map(async (name) => {
            const read = await readHistoryFile(historyEntryFile(root, workspaceId, name));

            return read.ok ? [shape(read.entry)] : [];
        }),
    );

    return shaped.flat();
}

/** Reads every entry of a workspace, newest first. */
export async function listHistory(root: string, workspaceId: string): Promise<ListedHistory> {
    return readHistoryFiles(root, workspaceId, await historyFileNames(root, workspaceId));
}

/**
 * The workspaces of an origin that kept a history, by the name of their folder. Anything else in
 * there, a stray file or a folder no workspace could be named, is no workspace.
 */
export async function historyWorkspaceIds(root: string): Promise<string[]> {
    const entries = await entriesOrNone(historiesDir(root));

    return entries
        .filter((entry) => entry.isDirectory() && SEGMENT.test(entry.name))
        .map((entry) => entry.name);
}
