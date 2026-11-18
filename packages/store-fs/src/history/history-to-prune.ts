import type { HistoryEntry, ResponseBody } from '@mandor/schema';

import { compactSentAt } from './history-path.js';

const DAY_MS = 86_400_000;

type HistoryLimits = { maxEntries: number; maxAgeDays: number };

/** The file names of the entries of one workspace, split by `historyToPrune`, newest first. */
type PrunedHistory = { remove: string[]; keep: string[] };

/**
 * Splits the files of the history into what stays and what goes: first what is older than
 * `maxAgeDays`, then, of what is left, whatever passes `maxEntries` counting from the newest. A
 * name starts with the compact time of its send, so the split opens no file, and one that no
 * longer parses goes when its time comes like any other.
 */
export function historyToPrune(
    names: readonly string[],
    now: Date,
    limits: HistoryLimits,
): PrunedHistory {
    const cutoff = new Date(now.getTime() - limits.maxAgeDays * DAY_MS).toISOString();
    const oldest = compactSentAt(cutoff);
    const sorted = [...names].sort().reverse();
    const young = sorted.filter((name) => name.slice(0, oldest.length) >= oldest);
    const keep = young.slice(0, limits.maxEntries);
    const kept = new Set(keep);

    return { keep, remove: sorted.filter((name) => !kept.has(name)) };
}

/** The bodies an entry names: what it sent, and what came back when anything did. */
function bodiesOf(entry: HistoryEntry): (ResponseBody | null)[] {
    if (entry.outcome.kind !== 'response') {
        return [entry.request.body];
    }

    return [entry.request.body, entry.outcome.response.body];
}

/** A body the app spilled to disk: the file it lives in and the bytes it holds. */
type StoredBody = { ref: string; bytes: number };

function storedOf(body: ResponseBody | null): StoredBody[] {
    if (body?.kind !== 'stored') {
        return [];
    }

    return [{ ref: body.ref, bytes: body.bytes }];
}

function storedRefsOf(entry: HistoryEntry): string[] {
    return bodiesOf(entry)
        .flatMap(storedOf)
        .map((body) => body.ref);
}

/** The bytes of the stored bodies of an entry that no newer entry already counted. */
function freshBytes(entry: HistoryEntry, counted: Set<string>): number {
    const fresh = new Map(
        bodiesOf(entry)
            .flatMap(storedOf)
            .filter((body) => !counted.has(body.ref))
            .map((body) => [body.ref, body.bytes]),
    );

    return [...fresh.values()].reduce((sum, bytes) => sum + bytes, 0);
}

/**
 * The entries, newest first, whose stored bodies would carry the history past `budget` bytes.
 * A body several entries name counts once. An entry with no stored body of its own never goes for
 * this, and neither does the newest, whatever it holds: it is the send the person just made.
 */
export function historyOverBudget(
    entries: readonly HistoryEntry[],
    budget: number,
): HistoryEntry[] {
    const counted = new Set<string>();
    const over: HistoryEntry[] = [];
    let total = 0;

    for (const [index, entry] of entries.entries()) {
        const bytes = freshBytes(entry, counted);

        if (index > 0 && bytes > 0 && total + bytes > budget) {
            over.push(entry);
            continue;
        }

        storedRefsOf(entry).forEach((ref) => counted.add(ref));
        total += bytes;
    }

    return over;
}

/**
 * The stored bodies only the removed entries name. A body a kept entry still points at stays,
 * and nothing outside these two lists is touched: a body just spilled whose send has not written
 * its entry yet belongs to neither.
 */
export function orphanBodies(
    remove: readonly HistoryEntry[],
    keep: readonly HistoryEntry[],
): string[] {
    const alive = new Set(keep.flatMap(storedRefsOf));
    const doomed = new Set(remove.flatMap(storedRefsOf));

    return [...doomed].filter((ref) => !alive.has(ref));
}
