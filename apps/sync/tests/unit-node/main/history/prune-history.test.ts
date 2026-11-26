import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { HistoryEntry } from '@mandor/schema';
import {
    bodiesDir,
    historyDir,
    historyEntryFile,
    historyFileName,
    listHistory,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { deleteHistory } from '../../../../src/main/history/delete-history.js';
import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import {
    DEFAULT_PRUNE_LIMITS,
    HISTORY_MAX_AGE_DAYS,
    HISTORY_MAX_ENTRIES,
} from '../../../../src/main/history/history-limits.js';
import { recordHistory } from '../../../../src/main/history/history-writer.js';
import { pruneHistory } from '../../../../src/main/history/prune-history.js';
import { diskBodySpill } from '../../../../src/main/request/disk-body-spill.js';
import { idOf, responseOf, sendOf } from './history-fixture.js';

const NOW = new Date(Date.UTC(2026, 8, 1, 12));
const DAY = 24 * 60 * 60 * 1000;

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-history-prune-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

/** A body in the store, as a send too big for its file would have left it. */
async function spill(ref: string): Promise<void> {
    const body = await diskBodySpill(root);

    await body.write(Buffer.from(ref));
    await body.finish(ref);
}

async function bodies(): Promise<string[]> {
    return (await readdir(bodiesDir(root)).catch(() => [])).sort();
}

async function ids(): Promise<string[]> {
    return (await listHistory(root, 'pagos')).entries.map((entry) => entry.id);
}

/** An entry written `agoMs` before NOW, whose response body is the stored one `ref`, if any. */
async function entryAt(n: number, agoMs: number, ref?: string): Promise<HistoryEntry> {
    const body =
        ref === undefined
            ? null
            : { kind: 'stored' as const, ref, bytes: 100_000, contentType: 'text/plain' };
    const entry = await historyEntryOf(
        root,
        sendOf(root, n, {
            sentAt: new Date(NOW.getTime() - agoMs),
            response: responseOf(body),
        }),
    );

    await recordHistory(root, entry);

    return entry;
}

describe('pruning the history', () => {
    it('keeps the newest 500 sends and drops the oldest, with the body only it named', async () => {
        const oldRef = 'a'.repeat(64);
        const sharedRef = 'b'.repeat(64);

        await spill(oldRef);
        await spill(sharedRef);
        await entryAt(1, 2 * DAY, oldRef);
        await entryAt(2, 2 * DAY - 1, sharedRef);
        await Promise.all(
            Array.from({ length: HISTORY_MAX_ENTRIES - 1 }, (_value, index) =>
                entryAt(index + 3, DAY - index * 1000),
            ),
        );
        await entryAt(HISTORY_MAX_ENTRIES + 10, 1000, sharedRef);

        await pruneHistory(root, 'pagos', NOW);

        const kept = await ids();

        expect(kept).toHaveLength(HISTORY_MAX_ENTRIES);
        expect(kept).not.toContain(idOf(1));
        expect(kept).not.toContain(idOf(2));
        expect(await bodies()).toEqual([sharedRef]);
    });

    it('drops what is older than the days the history keeps', async () => {
        await entryAt(1, (HISTORY_MAX_AGE_DAYS + 1) * DAY);
        await entryAt(2, (HISTORY_MAX_AGE_DAYS - 1) * DAY);

        const removed = await pruneHistory(root, 'pagos', NOW);

        expect(await ids()).toEqual([idOf(2)]);
        expect(removed).toEqual([idOf(1)]);
    });

    it('keeps as many sends and as many days as it is told', async () => {
        await entryAt(1, 8 * DAY);
        await entryAt(2, 3000);
        await entryAt(3, 2000);
        await entryAt(4, 1000);

        const limits = { ...DEFAULT_PRUNE_LIMITS, maxEntries: 2, maxAgeDays: 7 };
        const removed = await pruneHistory(root, 'pagos', NOW, limits);

        expect(await ids()).toEqual([idOf(4), idOf(3)]);
        expect(removed.toSorted()).toEqual([idOf(1), idOf(2)].toSorted());
    });

    it('names no send when the history is within its limits', async () => {
        await entryAt(1, DAY);

        expect(await pruneHistory(root, 'pagos', NOW)).toEqual([]);
    });

    /** Read as a warning, such a file would have stayed forever: nothing ever lists it. */
    it('drops a file past the limits even when it no longer parses', async () => {
        const sentAt = new Date(NOW.getTime() - (HISTORY_MAX_AGE_DAYS + 1) * DAY).toISOString();

        await mkdir(historyDir(root, 'pagos'), { recursive: true });
        await writeFile(
            historyEntryFile(root, 'pagos', historyFileName(sentAt, idOf(1))),
            '{ roto',
            'utf8',
        );
        await entryAt(2, DAY);

        await pruneHistory(root, 'pagos', NOW);

        expect(await readdir(historyDir(root, 'pagos'))).toHaveLength(1);
        expect(await ids()).toEqual([idOf(2)]);
    });

    it('does nothing in a workspace that has no history', async () => {
        await expect(pruneHistory(root, 'pagos', NOW)).resolves.toEqual([]);
    });

    it('leaves a body that no entry named, such as one a send is still writing', async () => {
        const loose = 'c'.repeat(64);

        await spill(loose);
        await entryAt(1, (HISTORY_MAX_AGE_DAYS + 1) * DAY);

        await pruneHistory(root, 'pagos', NOW);

        expect(await bodies()).toEqual([loose]);
    });
});

describe('deleting from the history', () => {
    it('deletes the sends it names and the bodies no other send names', async () => {
        const alone = 'd'.repeat(64);
        const shared = 'e'.repeat(64);

        await spill(alone);
        await spill(shared);
        await entryAt(1, 3000, alone);
        await entryAt(2, 2000, shared);
        await entryAt(3, 1000, shared);

        await deleteHistory(root, { workspaceId: 'pagos', ids: [idOf(1), idOf(2)] });

        expect(await ids()).toEqual([idOf(3)]);
        expect(await bodies()).toEqual([shared]);
    });

    it('deletes every send of the workspace, and every body they named', async () => {
        const ref = 'f'.repeat(64);

        await spill(ref);
        await entryAt(1, 2000, ref);
        await entryAt(2, 1000, ref);

        await deleteHistory(root, { workspaceId: 'pagos', all: true });

        expect(await ids()).toEqual([]);
        expect(await bodies()).toEqual([]);
    });
});
