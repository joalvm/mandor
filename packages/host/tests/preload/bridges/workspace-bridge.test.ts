import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createWorkspaceBridge } from '../../../src/preload/bridges/workspace-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the workspace bridge of the preload', () => {
    it('sends the create call to its channel and the list call without a payload', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createWorkspaceBridge(createBridgeCall(ipc));

        await bridge.create({ name: 'Echo' });
        await bridge.list();

        expect(ipc.calls).toEqual([
            [CHANNELS.workspaceCreate, { name: 'Echo' }],
            [CHANNELS.workspaceList, undefined],
        ]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        await expect(
            createWorkspaceBridge(createBridgeCall(spyBridgeIpc())).list(),
        ).resolves.toEqual(REFUSED);
    });
});
