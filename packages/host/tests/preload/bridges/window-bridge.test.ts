import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createWindowBridge } from '../../../src/preload/bridges/window-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the window bridge of the preload', () => {
    it('moves the window through the channels that own it', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createWindowBridge(createBridgeCall(ipc), ipc);

        await bridge.minimize();
        await bridge.toggleMaximize();
        await bridge.close();
        await bridge.popupAppMenu({ x: 12, y: 39 });
        await bridge.relaunch();
        await bridge.ready();

        expect(ipc.calls).toEqual([
            [CHANNELS.windowMinimize, undefined],
            [CHANNELS.windowToggleMaximize, undefined],
            [CHANNELS.windowClose, undefined],
            [CHANNELS.windowPopupMenu, { x: 12, y: 39 }],
            [CHANNELS.appRelaunch, undefined],
            [CHANNELS.windowReady, undefined],
        ]);
    });

    it('delivers the maximized push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createWindowBridge(createBridgeCall(ipc), ipc).onMaximizedChange((push) =>
            seen.push(push),
        );

        ipc.emit(CHANNELS.windowMaximized, { maximized: true });
        stop();
        ipc.emit(CHANNELS.windowMaximized, { maximized: false });

        expect(seen).toEqual([{ maximized: true }]);
        expect(ipc.listeners.get(CHANNELS.windowMaximized)).toEqual([]);
    });

    /**
     * The push arrives validated at this edge; a push that does not parse is a bug in main,
     * and it is louder thrown than quietly believed.
     */
    it('refuses a maximized push that does not match its schema', () => {
        const ipc = spyBridgeIpc();

        createWindowBridge(createBridgeCall(ipc), ipc).onMaximizedChange(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.windowMaximized, { maximized: 'yes' });
        }).toThrow();
    });
});
