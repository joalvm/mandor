import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createImportBridge } from '../../../src/preload/bridges/import-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the import bridge of the preload', () => {
    it('sends every call to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createImportBridge(createBridgeCall(ipc), ipc);

        await bridge.plan({
            workspaceId: 'pasarela',
            files: [{ path: 'api.yaml', text: 'asyncapi: 3.0.0' }],
            scope: 'workspace',
        });
        await bridge.apply({
            target: { workspaceId: 'pasarela' },
            name: 'Pasarela',
            plan: { identity: null, entries: [] },
        });
        await bridge.pick({ input: 'folder' });
        await bridge.cancel();

        expect(ipc.calls.map(([channel]) => channel)).toEqual([
            CHANNELS.importPlanBuild,
            CHANNELS.importApply,
            CHANNELS.importPick,
            CHANNELS.importCancel,
        ]);
        expect(ipc.calls[2]?.[1]).toEqual({ input: 'folder' });
    });

    it('hands over the progress main pushes, until it is unsubscribed', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createImportBridge(createBridgeCall(ipc), ipc).onProgress((push) =>
            seen.push(push),
        );

        ipc.emit(CHANNELS.importProgress, { files: 50 });
        stop();
        ipc.emit(CHANNELS.importProgress, { files: 100 });

        expect(seen).toEqual([{ files: 50 }]);
    });
});
