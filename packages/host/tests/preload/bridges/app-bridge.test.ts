import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createAppBridge } from '../../../src/preload/bridges/app-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the app bridge of the preload', () => {
    it('asks who the app is, shows the licenses and sets the scheme through the channels that own them', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createAppBridge(createBridgeCall(ipc));

        await bridge.about();
        await bridge.openLicenses();
        await bridge.configureAppearance({ source: 'dark' });

        expect(ipc.calls).toEqual([
            [CHANNELS.appAbout, undefined],
            [CHANNELS.appOpenLicenses, undefined],
            [CHANNELS.appearanceConfigure, { source: 'dark' }],
        ]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        const ipc = spyBridgeIpc();

        await expect(createAppBridge(createBridgeCall(ipc)).about()).resolves.toEqual(REFUSED);
    });
});
