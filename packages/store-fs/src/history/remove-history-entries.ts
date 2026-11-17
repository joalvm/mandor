import { rm } from 'node:fs/promises';

import { assertHistoryId, historyEntryFile } from './history-path.js';
import { historyFileNames } from './list-history.js';

/**
 * Deletes these files of the history, whether they parse or not. Every name is checked before
 * the first file goes, and one already gone is what the caller wanted.
 */
export async function removeHistoryFiles(
    root: string,
    workspaceId: string,
    names: readonly string[],
): Promise<void> {
    const paths = names.map((name) => historyEntryFile(root, workspaceId, name));

    await Promise.all(paths.map((path) => rm(path, { force: true })));
}

/** Deletes the entries of these ids. One that is already gone is what the caller wanted. */
export async function removeHistoryEntries(
    root: string,
    workspaceId: string,
    ids: readonly string[],
): Promise<void> {
    ids.forEach(assertHistoryId);

    const names = await historyFileNames(root, workspaceId);
    const doomed = names.filter((name) => ids.some((id) => name.endsWith(`-${id}.json`)));

    await removeHistoryFiles(root, workspaceId, doomed);
}
