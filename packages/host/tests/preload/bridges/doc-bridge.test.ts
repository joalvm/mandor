import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createDocBridge } from '../../../src/preload/bridges/doc-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the doc bridge of the preload', () => {
    it('sends every call to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createDocBridge(createBridgeCall(ipc));

        await bridge.list({ workspaceId: 'ws' });
        await bridge.read({ workspaceId: 'ws', name: 'notes.md' });
        await bridge.write({ workspaceId: 'ws', name: 'notes.md', text: '# Guide' });
        await bridge.revert({ workspaceId: 'ws', name: 'notes.md' });

        expect(ipc.calls).toEqual([
            [CHANNELS.docList, { workspaceId: 'ws' }],
            [CHANNELS.docRead, { workspaceId: 'ws', name: 'notes.md' }],
            [CHANNELS.docWrite, { workspaceId: 'ws', name: 'notes.md', text: '# Guide' }],
            [CHANNELS.docRevert, { workspaceId: 'ws', name: 'notes.md' }],
        ]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        await expect(
            createDocBridge(createBridgeCall(spyBridgeIpc())).read({
                workspaceId: 'ws',
                name: 'notes.md',
            }),
        ).resolves.toEqual(REFUSED);
    });
});
