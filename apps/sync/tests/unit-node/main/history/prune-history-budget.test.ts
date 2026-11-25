import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodiesDir, listHistory } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import { DEFAULT_PRUNE_LIMITS } from '../../../../src/main/history/history-limits.js';
import { recordHistory } from '../../../../src/main/history/history-writer.js';
import { pruneHistory } from '../../../../src/main/history/prune-history.js';
import { diskBodySpill } from '../../../../src/main/request/disk-body-spill.js';
import { idOf, responseOf, sendOf } from './history-fixture.js';

const NOW = new Date(Date.UTC(2026, 8, 1, 12));
const BODY_BYTES = 1000;
/** The usual limits, with a budget two bodies of the test fit and a third does not. */
const TIGHT = { ...DEFAULT_PRUNE_LIMITS, maxBodyBytes: 2500 };

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-history-budget-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

/** The n-th send, `n` seconds before NOW, whose response is a stored body of its own. */
async function heavySend(n: number): Promise<string> {
    const ref = String(n).repeat(64);
    const body = await diskBodySpill(root);

    await body.write(Buffer.alloc(BODY_BYTES, n));
    await body.finish(ref);

    const stored = { kind: 'stored' as const, ref, bytes: BODY_BYTES, contentType: 'text/plain' };

    await recordHistory(
        root,
        await historyEntryOf(
            root,
            sendOf(root, n, {
                sentAt: new Date(NOW.getTime() - (10 - n) * 1000),
                response: responseOf(stored),
            }),
        ),
    );

    return ref;
}

describe('pruning the history by the bytes of its bodies', () => {
    it('drops the oldest sends whose bodies pass the budget, and their bodies', async () => {
        await heavySend(1);
        await heavySend(2);

        const kept = [await heavySend(3), await heavySend(4)];

        const removed = await pruneHistory(root, 'pagos', NOW, TIGHT);

        expect(removed).toEqual([idOf(2), idOf(1)]);
        expect((await listHistory(root, 'pagos')).entries.map((entry) => entry.id)).toEqual([
            idOf(4),
            idOf(3),
        ]);
        expect((await readdir(bodiesDir(root))).sort()).toEqual(kept.sort());
    });

    it('keeps every send while their bodies fit the budget', async () => {
        await heavySend(1);
        await heavySend(2);

        expect(await pruneHistory(root, 'pagos', NOW, TIGHT)).toEqual([]);
    });
});
