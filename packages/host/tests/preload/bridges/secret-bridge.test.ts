import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createSecretBridge } from '../../../src/preload/bridges/secret-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the secret bridge of the preload', () => {
    it('sends the set call, value included, to its channel', async () => {
        const answer = { ok: true, value: {} };
        const ipc = spyBridgeIpc({ [CHANNELS.secretSet]: answer });
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', name: 'api_key', value: 's3cret' };

        await expect(bridge.set(input)).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.secretSet, input]]);
    });

    it('sends the clear call to its channel', async () => {
        const answer = { ok: true, value: {} };
        const ipc = spyBridgeIpc({ [CHANNELS.secretClear]: answer });
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', name: 'api_key' };

        await expect(bridge.clear(input)).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.secretClear, input]]);
    });

    /** Only `reveal` brings a value back, and only because the owner asked for it by name. */
    it('answers the reveal with the value it validated', async () => {
        const answer = { ok: true, value: { value: 's3cret' } };
        const ipc = spyBridgeIpc({ [CHANNELS.secretReveal]: answer });
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', name: 'api_key' };

        await expect(bridge.reveal(input)).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.secretReveal, input]]);
    });

    /** `null` is a variable that is declared here and has no value on this machine. */
    it('answers the reveal with null for a variable without a value here', async () => {
        const answer = { ok: true, value: { value: null } };
        const ipc = spyBridgeIpc({ [CHANNELS.secretReveal]: answer });
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', name: 'api_key' };

        await expect(bridge.reveal(input)).resolves.toEqual(answer);
    });

    it('answers the kept call with the names it validated, and never the values', async () => {
        const answer = { ok: true, value: ['api_key'] };
        const ipc = spyBridgeIpc({ [CHANNELS.secretKept]: answer });
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev' };

        await expect(bridge.kept(input)).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([[CHANNELS.secretKept, input]]);
    });

    /** Each answer is validated at this edge; a reveal without a value is not believed. */
    it('refuses an answer that does not match the contract of its channel', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.secretReveal]: { ok: true, value: {} } });
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', name: 'api_key' };

        await expect(bridge.reveal(input)).rejects.toThrow();
    });

    /** A refusal is data too, and it belongs to the `ok: false` branch of the same contract. */
    it('hands a refusal through', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createSecretBridge(createBridgeCall(ipc));
        const input = { workspaceId: 'ws', environmentId: 'dev', name: 'api_key' };

        await expect(bridge.reveal(input)).resolves.toEqual(REFUSED);
    });
});
