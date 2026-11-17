import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createEnvironmentBridge } from '../../../src/preload/bridges/environment-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

const devEnvironment = { id: 'dev', name: 'Dev', variables: [] };

describe('the environment bridge of the preload', () => {
    it('sends the create call to its channel and answers with the environment it validated', async () => {
        const answer = { ok: true, value: devEnvironment };
        const ipc = spyBridgeIpc({ [CHANNELS.environmentCreate]: answer });
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));

        await expect(bridge.create({ workspaceId: 'ws', name: 'Dev' })).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([
            [CHANNELS.environmentCreate, { workspaceId: 'ws', name: 'Dev' }],
        ]);
    });

    it('sends the list call to its channel and answers with the environments it validated', async () => {
        const answer = { ok: true, value: [devEnvironment] };
        const ipc = spyBridgeIpc({ [CHANNELS.environmentList]: answer });
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));

        await expect(bridge.list({ workspaceId: 'ws' })).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.environmentList, { workspaceId: 'ws' }]]);
    });

    it('sends the update call to its channel and answers with the environment it validated', async () => {
        const answer = { ok: true, value: devEnvironment };
        const ipc = spyBridgeIpc({ [CHANNELS.environmentUpdate]: answer });
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', changes: { name: 'Dev 2' } };

        await expect(bridge.update(input)).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.environmentUpdate, input]]);
    });

    it('sends the delete call to its channel', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev' };

        await bridge.delete(input);

        expect(ipc.calls).toEqual([[CHANNELS.environmentDelete, input]]);
    });

    it('sends no payload for the active load and answers with the map it validated', async () => {
        const answer = { ok: true, value: { ws: 'dev' } };
        const ipc = spyBridgeIpc({ [CHANNELS.environmentActiveLoad]: answer });
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));

        await expect(bridge.loadActive()).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.environmentActiveLoad, undefined]]);
    });

    it('sends the active save call to its channel', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev' };

        await bridge.saveActive(input);

        expect(ipc.calls).toEqual([[CHANNELS.environmentActiveSave, input]]);
    });

    /**
     * Every answer is validated at this edge, where the schema of the channel exists; what
     * arrives the other way is not believed.
     */
    it('refuses an answer that does not match the contract of its channel', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.environmentList]: { ok: true, value: 'many' } });
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));

        await expect(bridge.list({ workspaceId: 'ws' })).rejects.toThrow();
    });

    /** A refusal is data too, and it belongs to the `ok: false` branch of the same contract. */
    it('hands a refusal through', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createEnvironmentBridge(createBridgeCall(ipc));

        await expect(bridge.loadActive()).resolves.toEqual(REFUSED);
    });
});
