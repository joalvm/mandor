import { CHANNELS } from '@mandor/ipc';
import { DEFAULT_NETWORK_SETTINGS } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createNetworkBridge } from '../../../src/preload/bridges/network-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the network bridge of the preload', () => {
    it('sends each call to its channel with its payload', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createNetworkBridge(createBridgeCall(ipc));

        await bridge.write(DEFAULT_NETWORK_SETTINGS);
        await bridge.setSecret({ target: { kind: 'proxy' }, value: 'pw' });

        expect(ipc.calls).toEqual([
            [CHANNELS.networkWrite, DEFAULT_NETWORK_SETTINGS],
            [CHANNELS.networkSecret, { target: { kind: 'proxy' }, value: 'pw' }],
        ]);
    });

    it('reads the settings and what the keychain keeps', async () => {
        const state = {
            settings: DEFAULT_NETWORK_SETTINGS,
            kept: { proxyPassword: true, passphrases: [] },
        };
        const ipc = spyBridgeIpc({ [CHANNELS.networkRead]: { ok: true, value: state } });

        await expect(createNetworkBridge(createBridgeCall(ipc)).read()).resolves.toEqual({
            ok: true,
            value: state,
        });
        expect(ipc.calls[0]?.[0]).toBe(CHANNELS.networkRead);
    });

    it('asks for a file by its purpose and gives back the path or null', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.networkChooseFile]: { ok: true, value: null } });

        await expect(createNetworkBridge(createBridgeCall(ipc)).chooseFile('pfx')).resolves.toEqual(
            { ok: true, value: null },
        );
        expect(ipc.calls).toEqual([[CHANNELS.networkChooseFile, { purpose: 'pfx' }]]);
    });

    /** An answer of main that is not the contract fails at this edge, not inside a form. */
    it('refuses an answer that breaks the contract', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.networkRead]: { ok: true, value: { settings: 'broken' } },
        });

        await expect(createNetworkBridge(createBridgeCall(ipc)).read()).rejects.toThrow();
    });
});
