import { CHANNELS, emptyResultSchema } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { bridgeKitOf } from '../../src/preload/bridge-kit.js';
import { spyBridgeIpc } from '../../src/testing/spy-bridge-ipc.js';

describe('the kit an app builds its own areas of the bridge with', () => {
    it('calls one channel with the payload it is given and hands back the answer', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.wsOpen]: { ok: true, value: {} } });

        await expect(
            bridgeKitOf(ipc).call(CHANNELS.wsOpen, emptyResultSchema, { connectionId: 'echo' }),
        ).resolves.toEqual({ ok: true, value: {} });
        expect(ipc.calls).toEqual([[CHANNELS.wsOpen, { connectionId: 'echo' }]]);
    });

    it('delivers the pushes of one channel until its own unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = bridgeKitOf(ipc).subscribe(CHANNELS.wsState, (push) => seen.push(push));

        ipc.emit(CHANNELS.wsState, 'first');
        stop();
        ipc.emit(CHANNELS.wsState, 'second');

        expect(seen).toEqual(['first']);
        expect(ipc.listeners.get(CHANNELS.wsState)).toEqual([]);
    });
});
