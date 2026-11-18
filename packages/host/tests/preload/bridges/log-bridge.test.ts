import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createLogBridge } from '../../../src/preload/bridges/log-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the log bridge of the preload', () => {
    it('hands the line to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const line = { level: 'error', source: 'unawaited', message: 'boom' } as const;

        await createLogBridge(createBridgeCall(ipc)).write(line);

        expect(ipc.calls).toEqual([[CHANNELS.logWrite, line]]);
    });
});
