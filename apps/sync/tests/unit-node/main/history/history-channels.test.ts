import { CHANNELS } from '@mandor/ipc';
import { closeRepo } from '@mandor/host/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { listedBy, payload, startHarness, stopHarness, type Harness } from './history-harness.js';

let h: Harness;

beforeEach(async () => {
    h = await startHarness();
});

afterEach(async () => {
    await stopHarness(h);
});

function send(path: string, options: { itemPath?: string; sendId?: string } = {}) {
    return h.ipc.call(CHANNELS.requestSend, payload(`{{baseUrl}}/${path}`, options));
}

describe('the channels of the history', () => {
    it('answers its four channels, and removes them all', () => {
        expect(h.ipc.registered()).toEqual(
            expect.arrayContaining([
                CHANNELS.historyList,
                CHANNELS.historyRead,
                CHANNELS.historyDelete,
                CHANNELS.historyConfigure,
            ]),
        );

        h.dispose();

        expect(h.ipc.registered()).toEqual([]);
    });

    it('lists newest first, and only the sends of one request when asked', async () => {
        await send('a', { itemPath: 'orders/list' });
        await send('b', { itemPath: 'orders/pay' });
        await send('c', { itemPath: 'orders/list' });

        const all = (await listedBy(h)) as { itemPath: string; sentAt: string }[];
        const own = await listedBy(h, 'orders/pay');

        expect(all).toHaveLength(3);
        expect(all.map((row) => row.sentAt)).toEqual(
            all.map((row) => row.sentAt).sort((a, b) => b.localeCompare(a)),
        );
        expect(own).toMatchObject([{ itemPath: 'orders/pay' }]);
    });

    it('reads one send in full by its id', async () => {
        const sendId = crypto.randomUUID();

        await send('echo', { sendId });

        const answer = await h.ipc.call(CHANNELS.historyRead, {
            workspaceId: 'payments',
            id: sendId,
        });

        expect(answer).toMatchObject({
            ok: true,
            value: { id: sendId, request: { method: 'GET' }, outcome: { kind: 'response' } },
        });
    });

    it('refuses to read a send that is not there', async () => {
        expect(
            await h.ipc.call(CHANNELS.historyRead, {
                workspaceId: 'payments',
                id: crypto.randomUUID(),
            }),
        ).toMatchObject({ ok: false, error: { code: 'fs-read' } });
    });

    it('deletes the sends it names, then all of them', async () => {
        const first = crypto.randomUUID();

        await send('a', { sendId: first });
        await send('b');

        expect(
            await h.ipc.call(CHANNELS.historyDelete, { workspaceId: 'payments', ids: [first] }),
        ).toEqual({ ok: true, value: {} });
        expect(await listedBy(h)).toHaveLength(1);

        await h.ipc.call(CHANNELS.historyDelete, { workspaceId: 'payments', all: true });

        expect(await listedBy(h)).toEqual([]);
    });

    /** The settings live in the window: the prune after the next send keeps what it says. */
    it('keeps as many sends as the window chose, from the next send on', async () => {
        const first = crypto.randomUUID();

        await send('a', { sendId: first });
        await send('b');

        expect(
            await h.ipc.call(CHANNELS.historyConfigure, { maxEntries: 1, maxAgeDays: 30 }),
        ).toEqual({ ok: true, value: {} });
        expect(await listedBy(h)).toHaveLength(2);

        await send('c');

        expect(await listedBy(h)).toHaveLength(1);
    });

    it('refuses what the contract does not describe, on every channel', async () => {
        for (const channel of [
            CHANNELS.historyList,
            CHANNELS.historyRead,
            CHANNELS.historyDelete,
            CHANNELS.historyConfigure,
        ]) {
            expect(await h.ipc.call(channel, { nonsense: true })).toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
        }

        expect(
            await h.ipc.call(CHANNELS.historyDelete, { workspaceId: 'payments', ids: [] }),
        ).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses while no origin is open', async () => {
        closeRepo();

        expect(await h.ipc.call(CHANNELS.historyList, { workspaceId: 'payments' })).toMatchObject({
            ok: false,
        });
    });
});
