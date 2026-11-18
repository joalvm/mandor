import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createExportBridge } from '../../../src/preload/bridges/export-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the export bridge of the preload', () => {
    it('asks main for the outline of a workspace in the format it names', async () => {
        const answer = { ok: true, value: { name: 'Demo', nodes: [] } };
        const ipc = spyBridgeIpc({ [CHANNELS.exportOutline]: answer });
        const input = { workspaceId: 'demo', format: 'fixture', scope: 'workspace' } as const;

        await expect(createExportBridge(createBridgeCall(ipc)).outline(input)).resolves.toEqual(
            answer,
        );
        expect(ipc.calls).toEqual([[CHANNELS.exportOutline, input]]);
    });

    /** `null` is the user closing the dialog: nothing was written, and nothing went wrong. */
    it('writes what was chosen where the dialog answers, and a null path when it was closed', async () => {
        const answer = { ok: true, value: { path: null } };
        const ipc = spyBridgeIpc({ [CHANNELS.exportWrite]: answer });
        const input = {
            workspaceId: 'demo',
            format: 'fixture',
            scope: 'collection' as const,
            collection: 'tienda',
            chosen: ['collection/0'],
        };

        await expect(createExportBridge(createBridgeCall(ipc)).write(input)).resolves.toEqual(
            answer,
        );
        expect(ipc.calls).toEqual([[CHANNELS.exportWrite, input]]);
    });

    /** The answer is validated at this edge; a path that is not a path is not believed. */
    it('refuses an answer that does not match the contract of its channel', async () => {
        const bridge = createExportBridge(
            createBridgeCall(
                spyBridgeIpc({ [CHANNELS.exportWrite]: { ok: true, value: { path: 5 } } }),
            ),
        );

        await expect(
            bridge.write({
                workspaceId: 'demo',
                format: 'fixture',
                scope: 'workspace',
                chosen: ['collection/0'],
            }),
        ).rejects.toThrow();
    });
});
