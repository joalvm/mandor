import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createHistoryBridge } from '../../../src/preload/history-bridge.js';
import { REFUSED, spyBridgeIpc } from '@mandor/host/testing/bridge';

const ID = '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11';

const SUMMARY = {
    id: ID,
    sentAt: '2026-09-01T00:00:00.000Z',
    itemPath: 'orders/list',
    method: 'GET',
    url: 'http://localhost/x',
    outcome: { kind: 'failure', code: 'request-timeout' },
};

describe('the history bridge', () => {
    it('lists, reads and deletes through the channels that own them', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.historyList]: { ok: true, value: { entries: [SUMMARY] } },
            [CHANNELS.historyDelete]: { ok: true, value: {} },
        });
        const bridge = createHistoryBridge(bridgeKitOf(ipc));

        expect(await bridge.list({ workspaceId: 'demo' })).toEqual({
            ok: true,
            value: { entries: [SUMMARY] },
        });
        expect(await bridge.remove({ workspaceId: 'demo', all: true })).toEqual({
            ok: true,
            value: {},
        });
        expect(ipc.calls).toEqual([
            [CHANNELS.historyList, { workspaceId: 'demo' }],
            [CHANNELS.historyDelete, { workspaceId: 'demo', all: true }],
        ]);
    });

    it('reads one send by its id, and answers a refusal as it is', async () => {
        const ipc = spyBridgeIpc();

        expect(
            await createHistoryBridge(bridgeKitOf(ipc)).read({ workspaceId: 'demo', id: ID }),
        ).toEqual(REFUSED);
        expect(ipc.calls).toEqual([[CHANNELS.historyRead, { workspaceId: 'demo', id: ID }]]);
    });

    /** What main answers is validated here: an answer out of contract is a bug in main. */
    it('throws on an answer that does not match its contract', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.historyList]: { ok: true, value: { entries: [{}] } },
        });

        await expect(
            createHistoryBridge(bridgeKitOf(ipc)).list({ workspaceId: 'demo' }),
        ).rejects.toThrow();
    });

    it('delivers an appended push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createHistoryBridge(bridgeKitOf(ipc)).onAppended((push) => seen.push(push));
        const push = { workspaceId: 'demo', summary: SUMMARY, removed: [] };

        ipc.emit(CHANNELS.historyAppended, push);
        stop();
        ipc.emit(CHANNELS.historyAppended, push);

        expect(seen).toEqual([push]);
        expect(ipc.listeners.get(CHANNELS.historyAppended)).toEqual([]);
    });

    it('refuses an appended push that does not match its schema', () => {
        const ipc = spyBridgeIpc();

        createHistoryBridge(bridgeKitOf(ipc)).onAppended(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.historyAppended, { workspaceId: 'demo' });
        }).toThrow();
    });
});
