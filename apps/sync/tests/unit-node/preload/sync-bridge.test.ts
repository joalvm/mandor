import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { createFakeBridge } from '@mandor/ipc/testing';
import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { syncBridgeOf } from '../../../src/preload/sync-bridge.js';
import { spyBridgeIpc } from '@mandor/host/testing/bridge';

const INPUT = {
    workspaceId: 'demo',
    itemPath: 'ping',
    environmentId: null,
    request: createRequestItem({ name: 'Ping' }),
};

describe('the bridge the window of Sync reaches', () => {
    it('keeps every area of the core as the host built it', () => {
        const core = createFakeBridge();
        const bridge = syncBridgeOf(core, bridgeKitOf(spyBridgeIpc()));

        expect(bridge.collections).toBe(core.collections);
        expect(bridge.export).toBe(core.export);
    });

    it('adds the request area, on its own channels', async () => {
        const ipc = spyBridgeIpc();
        const bridge = syncBridgeOf(createFakeBridge(), bridgeKitOf(ipc));

        await bridge.request.cancel({ sendId: '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11' });

        expect(ipc.calls.map(([channel]) => channel)).toEqual([CHANNELS.requestCancel]);
    });

    it('adds the history area, on its own channels', async () => {
        const ipc = spyBridgeIpc();
        const bridge = syncBridgeOf(createFakeBridge(), bridgeKitOf(ipc));

        await bridge.history.remove({ workspaceId: 'demo', all: true });

        expect(ipc.calls.map(([channel]) => channel)).toEqual([CHANNELS.historyDelete]);
    });

    it('adds the cookies area, on its own channels', async () => {
        const ipc = spyBridgeIpc();
        const bridge = syncBridgeOf(createFakeBridge(), bridgeKitOf(ipc));

        await bridge.cookies
            .clear({ workspaceId: 'demo', environmentId: null })
            .catch(() => undefined);

        expect(ipc.calls.map(([channel]) => channel)).toEqual([CHANNELS.cookiesClear]);
    });

    it('adds the codegen area, on its own channels', async () => {
        const ipc = spyBridgeIpc();
        const bridge = syncBridgeOf(createFakeBridge(), bridgeKitOf(ipc));

        await bridge.codegen.fromCurl({ text: 'curl x' }).catch(() => undefined);

        expect(ipc.calls.map(([channel]) => channel)).toEqual([CHANNELS.codegenFromCurl]);
    });

    it('adds the graphql area, on its own channels', async () => {
        const ipc = spyBridgeIpc();
        const bridge = syncBridgeOf(createFakeBridge(), bridgeKitOf(ipc));

        await bridge.graphql.readSchema(INPUT).catch(() => undefined);

        expect(ipc.calls.map(([channel]) => channel)).toEqual([CHANNELS.graphqlSchemaRead]);
    });
});
