import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createWsBridge } from '../../../src/preload/ws-bridge.js';
import { spyBridgeIpc } from '@mandor/host/testing/bridge';

describe('the ws bridge of the preload', () => {
    it('drives the socket through the channels that own it', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createWsBridge(bridgeKitOf(ipc));

        await bridge.open({
            connectionId: 'echo',
            workspaceId: 'ws',
            environmentId: null,
            transport: 'websocket',
            template: { url: 'wss://example.com' },
        });
        await bridge.send({
            connectionId: 'echo',
            workspaceId: 'ws',
            template: '{{url}}',
            origin: null,
            itemPath: null,
        });
        await bridge.close({ connectionId: 'echo' });

        expect(ipc.calls).toEqual([
            [
                CHANNELS.wsOpen,
                {
                    connectionId: 'echo',
                    workspaceId: 'ws',
                    environmentId: null,
                    transport: 'websocket',
                    template: { url: 'wss://example.com' },
                },
            ],
            [
                CHANNELS.wsSend,
                {
                    connectionId: 'echo',
                    workspaceId: 'ws',
                    template: '{{url}}',
                    origin: null,
                    itemPath: null,
                },
            ],
            [CHANNELS.wsClose, { connectionId: 'echo' }],
        ]);
    });

    it('delivers a state push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createWsBridge(bridgeKitOf(ipc)).onState((push) => seen.push(push));

        ipc.emit(CHANNELS.wsState, { connectionId: 'echo', state: 'open' });
        stop();
        ipc.emit(CHANNELS.wsState, { connectionId: 'echo', state: 'closed' });

        expect(seen).toEqual([{ connectionId: 'echo', state: 'open' }]);
        expect(ipc.listeners.get(CHANNELS.wsState)).toEqual([]);
    });

    it('delivers a batch of activity and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createWsBridge(bridgeKitOf(ipc)).onActivity((push) => seen.push(push));
        const push = {
            connectionId: 'echo',
            environmentId: 'dev',
            records: [{ direction: 'in', data: 'hello', at: 12, origin: 'Echo' }],
        };

        ipc.emit(CHANNELS.wsActivity, push);
        stop();
        ipc.emit(CHANNELS.wsActivity, { ...push, records: [] });

        expect(seen).toEqual([push]);
        expect(ipc.listeners.get(CHANNELS.wsActivity)).toEqual([]);
    });

    /**
     * State and activity arrive validated at this edge; a push that does not parse is a bug in
     * main, and it is louder thrown than quietly believed.
     */
    it('refuses a state push that does not match its schema', () => {
        const ipc = spyBridgeIpc();

        createWsBridge(bridgeKitOf(ipc)).onState(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.wsState, { connectionId: 'echo', state: 'melted' });
        }).toThrow();
    });

    it('refuses an activity push that does not match its schema', () => {
        const ipc = spyBridgeIpc();

        createWsBridge(bridgeKitOf(ipc)).onActivity(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.wsActivity, {
                connectionId: 'echo',
                environmentId: 'dev',
                records: [{ direction: 'sideways', data: 'hello', at: 12 }],
            });
        }).toThrow();
    });
});
