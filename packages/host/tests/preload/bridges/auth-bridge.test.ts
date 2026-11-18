import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createAuthBridge } from '../../../src/preload/bridges/auth-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the auth bridge of the preload', () => {
    it('sends read, write and the token calls to their channels with the payload whole', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createAuthBridge(createBridgeCall(ipc));

        await bridge.read({ workspaceId: 'api-pagos' });
        await bridge.write({
            workspaceId: 'api-pagos',
            auth: null,
        });
        await bridge.tokenStatus({
            workspaceId: 'api-pagos',
            environmentId: null,
            parentPath: null,
        });
        await bridge.tokenFetch({
            workspaceId: 'api-pagos',
            environmentId: 'prod',
            parentPath: null,
        });
        await bridge.tokenForget({
            workspaceId: 'api-pagos',
            environmentId: null,
            parentPath: null,
        });

        expect(ipc.calls).toEqual([
            [CHANNELS.authRead, { workspaceId: 'api-pagos' }],
            [CHANNELS.authWrite, { workspaceId: 'api-pagos', auth: null }],
            [
                CHANNELS.authTokenStatus,
                { workspaceId: 'api-pagos', environmentId: null, parentPath: null },
            ],
            [
                CHANNELS.authTokenFetch,
                { workspaceId: 'api-pagos', environmentId: 'prod', parentPath: null },
            ],
            [
                CHANNELS.authTokenForget,
                { workspaceId: 'api-pagos', environmentId: null, parentPath: null },
            ],
        ]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        await expect(
            createAuthBridge(createBridgeCall(spyBridgeIpc())).read({
                workspaceId: 'api-pagos',
            }),
        ).resolves.toEqual(REFUSED);
    });
});
