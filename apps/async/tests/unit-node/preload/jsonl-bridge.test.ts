import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createJsonlBridge } from '../../../src/preload/jsonl-bridge.js';
import { spyBridgeIpc } from '@mandor/host/testing/bridge';

describe('the jsonl bridge of the Async preload', () => {
    it('sends the jsonl call to its channel and answers with the file it validated', async () => {
        const answer = { ok: true, value: { path: 'D:/out/echo.jsonl' } };
        const ipc = spyBridgeIpc({ [CHANNELS.exportJsonl]: answer });
        const bridge = createJsonlBridge(bridgeKitOf(ipc));
        const input = { suggestedName: 'echo.jsonl', records: [{ name: 'echo' }] };

        await expect(bridge.jsonl(input)).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.exportJsonl, input]]);
    });

    /** `null` is the user closing the dialog: nothing was written, and nothing went wrong. */
    it('answers with a null path when the dialog was closed', async () => {
        const answer = { ok: true, value: { path: null } };
        const ipc = spyBridgeIpc({ [CHANNELS.exportJsonl]: answer });
        const bridge = createJsonlBridge(bridgeKitOf(ipc));
        const input = { suggestedName: 'echo.jsonl', records: [] };

        await expect(bridge.jsonl(input)).resolves.toEqual(answer);
    });

    /** The answer is validated at this edge; a path that is not a path is not believed. */
    it('refuses an answer that does not match the contract of its channel', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.exportJsonl]: { ok: true, value: { path: 5 } } });
        const bridge = createJsonlBridge(bridgeKitOf(ipc));
        const input = { suggestedName: 'echo.jsonl', records: [] };

        await expect(bridge.jsonl(input)).rejects.toThrow();
    });
});
