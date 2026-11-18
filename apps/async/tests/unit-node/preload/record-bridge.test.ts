import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createRecordBridge } from '../../../src/preload/record-bridge.js';
import { spyBridgeIpc } from '@mandor/host/testing/bridge';

describe('the record bridge', () => {
    it('asks for the save dialog by the name the caller suggests', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.recordPick]: { ok: true, value: { path: '/tmp/echo.jsonl' } },
        });
        const bridge = createRecordBridge(bridgeKitOf(ipc));

        const answer = await bridge.pick({ suggestedName: 'echo.jsonl' });

        expect(answer).toEqual({ ok: true, value: { path: '/tmp/echo.jsonl' } });
        expect(ipc.calls[0]).toEqual([CHANNELS.recordPick, { suggestedName: 'echo.jsonl' }]);
    });

    it('starts with the connection and the path the user picked, and stops by connection', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.recordStart]: { ok: true, value: {} },
            [CHANNELS.recordStop]: { ok: true, value: { entries: 41, path: '/tmp/echo.jsonl' } },
        });
        const bridge = createRecordBridge(bridgeKitOf(ipc));

        await bridge.start({ connectionId: 'echo', path: '/tmp/echo.jsonl' });
        const stopped = await bridge.stop({ connectionId: 'echo' });

        expect(ipc.calls[0]).toEqual([
            CHANNELS.recordStart,
            { connectionId: 'echo', path: '/tmp/echo.jsonl' },
        ]);
        expect(ipc.calls[1]).toEqual([CHANNELS.recordStop, { connectionId: 'echo' }]);
        expect(stopped).toEqual({ ok: true, value: { entries: 41, path: '/tmp/echo.jsonl' } });
    });

    it('answers the status of one connection and reveals where its file stayed', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.recordStatus]: { ok: true, value: { active: true, entries: 7 } },
            [CHANNELS.recordReveal]: { ok: true, value: {} },
        });
        const bridge = createRecordBridge(bridgeKitOf(ipc));

        const status = await bridge.status({ connectionId: 'echo' });

        await bridge.reveal({ path: '/tmp/echo.jsonl' });

        expect(status).toEqual({ ok: true, value: { active: true, entries: 7 } });
        expect(ipc.calls[0]).toEqual([CHANNELS.recordStatus, { connectionId: 'echo' }]);
        expect(ipc.calls[1]).toEqual([CHANNELS.recordReveal, { path: '/tmp/echo.jsonl' }]);
    });

    it('hands the state push to its subscriber, validated at this edge', () => {
        const ipc = spyBridgeIpc();

        const bridge = createRecordBridge(bridgeKitOf(ipc));
        const seen: unknown[] = [];

        const off = bridge.onState((push) => {
            seen.push(push);
        });

        ipc.emit(CHANNELS.recordState, {
            active: true,
            connectionId: 'echo',
            entries: 2,
        });

        expect(seen).toEqual([{ active: true, connectionId: 'echo', entries: 2 }]);

        off();

        ipc.emit(CHANNELS.recordState, {
            active: false,
            connectionId: 'echo',
            entries: 2,
        });

        expect(seen).toHaveLength(1);
    });
});
