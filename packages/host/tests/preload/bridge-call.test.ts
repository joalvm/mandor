import { CHANNELS, emptyResultSchema, originListResultSchema } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../src/preload/bridge-call.js';
import { REFUSED, spyBridgeIpc } from '../../src/testing/spy-bridge-ipc.js';

describe('the invoke the bridge call hands out', () => {
    it('sends the channel and the payload the caller gave to ipc', async () => {
        const ipc = spyBridgeIpc();

        await createBridgeCall(ipc)(CHANNELS.originRemove, emptyResultSchema, { id: 'local' });

        expect(ipc.calls).toEqual([[CHANNELS.originRemove, { id: 'local' }]]);
    });

    it('sends no payload when the caller gives none', async () => {
        const ipc = spyBridgeIpc();

        await createBridgeCall(ipc)(CHANNELS.originList, originListResultSchema);

        expect(ipc.calls).toEqual([[CHANNELS.originList, undefined]]);
    });

    /** Nothing throws across the bridge: a refusal of main is an answer like any other. */
    it('hands back a refusal of main as it came', async () => {
        await expect(
            createBridgeCall(spyBridgeIpc())(CHANNELS.originList, originListResultSchema),
        ).resolves.toEqual(REFUSED);
    });

    /** The window believes what crosses here, so an answer out of contract never reaches it. */
    it('throws an answer that its channel does not promise', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.originList]: { ok: true, value: [{ id: 'local' }] } });

        await expect(
            createBridgeCall(ipc)(CHANNELS.originList, originListResultSchema),
        ).rejects.toThrow();
    });

    it('throws a refusal with a code the window does not know', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.originRemove]: {
                ok: false,
                error: { code: 'kaput', message: 'from a newer main' },
            },
        });

        await expect(
            createBridgeCall(ipc)(CHANNELS.originRemove, emptyResultSchema, { id: 'x' }),
        ).rejects.toThrow();
    });
});
