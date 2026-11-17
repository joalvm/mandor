import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createGlobalsBridge } from '../../../src/preload/bridges/globals-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the globals bridge of the preload', () => {
    it('reads and writes through the channels of the globals, the payload whole', async () => {
        const answer = { ok: true, value: { variables: [] } };
        const ipc = spyBridgeIpc({
            [CHANNELS.globalsRead]: answer,
            [CHANNELS.globalsWrite]: answer,
        });
        const bridge = createGlobalsBridge(createBridgeCall(ipc));

        await expect(bridge.read({})).resolves.toEqual(answer);
        await expect(bridge.write({ globals: { variables: [] } })).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([
            [CHANNELS.globalsRead, {}],
            [CHANNELS.globalsWrite, { globals: { variables: [] } }],
        ]);
    });
});
