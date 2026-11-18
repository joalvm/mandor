import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodiesDir, listHistory } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    deleteHistory,
    forgetWorkspaceHistory,
} from '../../../../src/main/history/delete-history.js';
import { historyElsewhere } from '../../../../src/main/history/history-elsewhere.js';
import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import { HISTORY_MAX_AGE_DAYS } from '../../../../src/main/history/history-limits.js';
import { recordHistory } from '../../../../src/main/history/history-writer.js';
import { pruneHistory } from '../../../../src/main/history/prune-history.js';
import { diskBodySpill } from '../../../../src/main/request/disk-body-spill.js';
import { idOf, responseOf, sendOf } from './history-fixture.js';

const NOW = new Date(Date.UTC(2026, 8, 1, 12));
const DAY = 24 * 60 * 60 * 1000;
const SHARED = 'a'.repeat(64);

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-history-elsewhere-'));

    const body = await diskBodySpill(root);

    await body.write(Buffer.from(SHARED));
    await body.finish(SHARED);
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function bodies(): Promise<string[]> {
    return (await readdir(bodiesDir(root)).catch(() => [])).sort();
}

/** A send of `workspaceId`, written `agoMs` before NOW, whose response is the shared body. */
async function sentIn(workspaceId: string, n: number, agoMs: number): Promise<void> {
    const send = sendOf(root, n, {
        sentAt: new Date(NOW.getTime() - agoMs),
        response: responseOf({
            kind: 'stored',
            ref: SHARED,
            bytes: 100_000,
            contentType: 'text/plain',
        }),
    });

    await recordHistory(
        root,
        await historyEntryOf(root, { ...send, input: { ...send.input, workspaceId } }),
    );
}

/**
 * The store of bodies belongs to the origin, not to one workspace: two workspaces that got the
 * same big answer keep one file of it, and each of them names it.
 */
describe('a body two workspaces of the origin name', () => {
    it('stays when the limits take out the send of one of them', async () => {
        await sentIn('pagos', 1, (HISTORY_MAX_AGE_DAYS + 1) * DAY);
        await sentIn('envios', 2, DAY);

        await pruneHistory(root, 'pagos', NOW);

        expect(await bodies()).toEqual([SHARED]);
    });

    it('stays when every send of one of them is deleted', async () => {
        await sentIn('pagos', 1, DAY);
        await sentIn('envios', 2, DAY);

        await deleteHistory(root, { workspaceId: 'pagos', all: true });

        expect(await bodies()).toEqual([SHARED]);
    });

    it('goes with the last send that names it', async () => {
        await sentIn('pagos', 1, DAY);
        await sentIn('envios', 2, DAY);

        await deleteHistory(root, { workspaceId: 'pagos', all: true });
        await deleteHistory(root, { workspaceId: 'envios', all: true });

        expect(await bodies()).toEqual([]);
    });
});

describe('a workspace that is deleted', () => {
    it('lets its sends go, and the bodies only they named', async () => {
        await sentIn('pagos', 1, DAY);

        await forgetWorkspaceHistory(root, 'pagos');

        await expect(listHistory(root, 'pagos')).resolves.toMatchObject({ entries: [] });
        expect(await bodies()).toEqual([]);
    });

    it('keeps a body another workspace still names', async () => {
        await sentIn('pagos', 1, DAY);
        await sentIn('envios', 2, DAY);

        await forgetWorkspaceHistory(root, 'pagos');

        expect(await bodies()).toEqual([SHARED]);
    });
});

describe('historyElsewhere', () => {
    it('reads the sends of every other workspace of the origin, and none of this one', async () => {
        await sentIn('pagos', 1, DAY);
        await sentIn('envios', 2, DAY);
        await sentIn('stock', 3, DAY);

        const found = await historyElsewhere(root, 'pagos', [SHARED]);

        expect(found.map((entry) => entry.id).sort()).toEqual([idOf(2), idOf(3)]);
    });

    it('leaves out the sends that name none of the bodies asked about', async () => {
        await sentIn('envios', 2, DAY);

        await expect(historyElsewhere(root, 'pagos', ['b'.repeat(64)])).resolves.toEqual([]);
    });

    it('is empty for an origin with no history yet', async () => {
        await expect(historyElsewhere(root, 'pagos', [SHARED])).resolves.toEqual([]);
    });
});
