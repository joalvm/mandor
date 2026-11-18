import { CHANNELS, type UiSession } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createSessionBridge } from '../../../src/preload/bridges/session-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

const session: UiSession = {
    version: 2,
    activeWorkspaceId: null,
    activeGroupId: 'root',
    grid: { kind: 'leaf', id: 'root', tabs: [], activeTab: null },
    panels: { sidebarWidth: 260, contentSplit: 50, collapsedSections: [], splits: {} },
};

describe('the session bridge of the preload', () => {
    it('sends no payload for the load and answers with the session it validated', async () => {
        const answer = { ok: true, value: session };
        const ipc = spyBridgeIpc({ [CHANNELS.sessionLoad]: answer });
        const bridge = createSessionBridge(createBridgeCall(ipc));

        await expect(bridge.load()).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.sessionLoad, undefined]]);
    });

    it('sends the session to the save channel and answers with the empty it validated', async () => {
        const answer = { ok: true, value: {} };
        const ipc = spyBridgeIpc({ [CHANNELS.sessionSave]: answer });
        const bridge = createSessionBridge(createBridgeCall(ipc));

        await expect(bridge.save({ session })).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.sessionSave, { session }]]);
    });

    /**
     * A load that does not match the renderer contract is refused here, not believed: it is a
     * bug in main, and it is louder thrown.
     */
    it('refuses a load that does not match the renderer contract', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.sessionLoad]: { ok: true, value: { tabs: 'many' } } });
        const bridge = createSessionBridge(createBridgeCall(ipc));

        await expect(bridge.load()).rejects.toThrow();
    });

    /** A refusal is data too, and it belongs to the `ok: false` branch of the same contract. */
    it('hands a refusal through', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createSessionBridge(createBridgeCall(ipc));

        await expect(bridge.load()).resolves.toEqual(REFUSED);
    });
});
