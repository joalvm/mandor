import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bodiesDir } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { deleteHistory } from '../../../../src/main/history/delete-history.js';
import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import { HISTORY_MAX_AGE_DAYS } from '../../../../src/main/history/history-limits.js';
import { recordHistory } from '../../../../src/main/history/history-writer.js';
import { pruneHistory } from '../../../../src/main/history/prune-history.js';
import { bodyHold, removeUnheldBodies } from '../../../../src/main/request/body-holds.js';
import { diskBodySpill } from '../../../../src/main/request/disk-body-spill.js';
import { responseOf, sendOf } from '../history/history-fixture.js';

const NOW = new Date(Date.UTC(2026, 8, 1, 12));
const DAY = 24 * 60 * 60 * 1000;
const SHARED = 'b'.repeat(64);

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-body-holds-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function bodies(): Promise<string[]> {
    return (await readdir(bodiesDir(root)).catch(() => [])).sort();
}

/** The body a send in flight spills, kept by `hold` until the send lets it go. */
async function spilledUnder(hold: ReturnType<typeof bodyHold>): Promise<void> {
    const spill = await diskBodySpill(root, hold);

    await spill.write(Buffer.from(SHARED));
    await spill.finish(SHARED);
}

/** An entry of `pagos`, written `agoMs` before NOW, whose response is the shared body. */
async function namedBy(agoMs: number): Promise<void> {
    const send = sendOf(root, 1, {
        sentAt: new Date(NOW.getTime() - agoMs),
        response: responseOf({ kind: 'stored', ref: SHARED, bytes: 64, contentType: 'text/plain' }),
    });

    await recordHistory(root, await historyEntryOf(root, send));
}

/**
 * A send spills its body before it writes the entry that names it. In between, the body is named
 * by nobody, and an old entry of the same bytes that goes must not take it along.
 */
describe('a body a send in flight holds', () => {
    it('stays when the limits take out the last entry that named it', async () => {
        const hold = bodyHold(root);

        await namedBy((HISTORY_MAX_AGE_DAYS + 1) * DAY);
        await spilledUnder(hold);
        await pruneHistory(root, 'pagos', NOW);
        hold.release();

        expect(await bodies()).toEqual([SHARED]);
    });

    it('stays when the last entry that named it is deleted', async () => {
        const hold = bodyHold(root);

        await namedBy(DAY);
        await spilledUnder(hold);
        await deleteHistory(root, { workspaceId: 'pagos', all: true });
        hold.release();

        expect(await bodies()).toEqual([SHARED]);
    });

    it('goes once every send that held it let it go', async () => {
        const first = bodyHold(root);
        const second = bodyHold(root);

        await spilledUnder(first);
        await spilledUnder(second);
        first.release();
        await removeUnheldBodies(root, [SHARED]);

        expect(await bodies()).toEqual([SHARED]);

        second.release();
        await removeUnheldBodies(root, [SHARED]);

        expect(await bodies()).toEqual([]);
    });

    it('is held only in the origin the send was made in', async () => {
        const here = bodyHold(root);
        const elsewhere = bodyHold(join(root, 'elsewhere'));

        await spilledUnder(here);
        here.release();
        elsewhere.keep(SHARED);
        await removeUnheldBodies(root, [SHARED]);
        elsewhere.release();

        expect(await bodies()).toEqual([]);
    });
});
