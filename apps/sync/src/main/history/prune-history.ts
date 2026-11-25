import type { HistoryEntry } from '@mandor/schema';
import {
    bodiesBytes,
    historyFileName,
    historyFileNames,
    historyOverBudget,
    historyToPrune,
    orphanBodies,
    readHistoryFiles,
    removeHistoryFiles,
} from '@mandor/store-fs';

import { removeUnheldBodies } from '../request/body-holds.js';
import { historyElsewhere } from './history-elsewhere.js';
import { DEFAULT_PRUNE_LIMITS, type PruneLimits } from './history-limits.js';

/**
 * The entries that may still name a body of what goes: the kept ones of this workspace and every
 * one of the others of the origin, whose bodies share the store. Opened only when what goes named
 * a stored body at all.
 */
async function keptEntries(
    root: string,
    workspaceId: string,
    removed: readonly HistoryEntry[],
    keep: readonly string[],
): Promise<HistoryEntry[]> {
    const named = orphanBodies(removed, []);

    if (named.length === 0) {
        return [];
    }

    const [kept, elsewhere] = await Promise.all([
        readHistoryFiles(root, workspaceId, keep),
        historyElsewhere(root, workspaceId, named),
    ]);

    return [...kept.entries, ...elsewhere];
}

/** Takes out the files past the count and the age, and the bodies only they named. */
async function pruneByNames(
    root: string,
    workspaceId: string,
    split: { keep: string[]; remove: string[] },
): Promise<string[]> {
    if (split.remove.length === 0) {
        return [];
    }

    const removed = await readHistoryFiles(root, workspaceId, split.remove);
    const kept = await keptEntries(root, workspaceId, removed.entries, split.keep);

    await removeHistoryFiles(root, workspaceId, split.remove);
    await removeUnheldBodies(root, orphanBodies(removed.entries, kept));

    return removed.entries.map((entry) => entry.id);
}

/**
 * Takes out the oldest sends whose stored bodies pass the budget. The store is measured first by
 * listing it: while all of it fits, so do the bodies of this workspace, and no entry is opened.
 */
async function pruneByBytes(
    root: string,
    workspaceId: string,
    names: readonly string[],
    budget: number,
): Promise<string[]> {
    if ((await bodiesBytes(root)) <= budget) {
        return [];
    }

    const { entries } = await readHistoryFiles(root, workspaceId, names);
    const over = historyOverBudget(entries, budget);

    if (over.length === 0) {
        return [];
    }

    const kept = entries.filter((entry) => !over.includes(entry));
    const elsewhere = await historyElsewhere(root, workspaceId, orphanBodies(over, kept));

    await removeHistoryFiles(
        root,
        workspaceId,
        over.map((entry) => historyFileName(entry.sentAt, entry.id)),
    );
    await removeUnheldBodies(root, orphanBodies(over, [...kept, ...elsewhere]));

    return over.map((entry) => entry.id);
}

/**
 * Applies the limits of the history to one workspace, and names the sends it took out that a list
 * could have shown. It runs after each write and the send waits for it, so it decides on file
 * names and the size of the store, and opens entries only when something goes. A body goes when
 * no kept entry names it, and never by a sweep of the folder. One just spilled whose send has not
 * written its entry yet is named by nobody, and the send holds it: an old entry of the same bytes
 * that goes leaves it where it is.
 */
export async function pruneHistory(
    root: string,
    workspaceId: string,
    now: Date,
    limits: PruneLimits = DEFAULT_PRUNE_LIMITS,
): Promise<string[]> {
    const split = historyToPrune(await historyFileNames(root, workspaceId), now, limits);
    const byNames = await pruneByNames(root, workspaceId, split);
    const byBytes = await pruneByBytes(root, workspaceId, split.keep, limits.maxBodyBytes);

    return [...byNames, ...byBytes];
}
