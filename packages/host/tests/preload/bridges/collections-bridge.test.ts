import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createCollectionsBridge } from '../../../src/preload/bridges/collections-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the collection bridge of the preload', () => {
    it('sends every call to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createCollectionsBridge(createBridgeCall(ipc));

        await bridge.tree({ workspaceId: 'ws' });
        await bridge.move({
            workspaceId: 'ws',
            from: 'folder/echo',
            to: 'other',
            kind: 'item',
            before: null,
        });
        await bridge.reorder({ workspaceId: 'ws', parent: '', name: 'folder', before: null });
        await bridge.renameFolder({ workspaceId: 'ws', path: 'folder', name: 'Renamed' });
        await bridge.renameItem({ workspaceId: 'ws', path: 'folder/echo', name: 'Renamed' });
        await bridge.create({ workspaceId: 'ws', parent: '', name: 'New folder' });
        await bridge.delete({ workspaceId: 'ws', path: 'folder/echo' });
        await bridge.readItem({ workspaceId: 'ws', path: 'folder/echo' });
        await bridge.writeItem({
            workspaceId: 'ws',
            path: 'folder/echo',
            fields: { kind: 'echo', name: 'Echo' },
        });

        expect(ipc.calls).toEqual([
            [CHANNELS.collectionTree, { workspaceId: 'ws' }],
            [
                CHANNELS.collectionMove,
                { workspaceId: 'ws', from: 'folder/echo', to: 'other', kind: 'item', before: null },
            ],
            [
                CHANNELS.collectionReorder,
                { workspaceId: 'ws', parent: '', name: 'folder', before: null },
            ],
            [
                CHANNELS.collectionRenameFolder,
                { workspaceId: 'ws', path: 'folder', name: 'Renamed' },
            ],
            [
                CHANNELS.collectionRenameItem,
                { workspaceId: 'ws', path: 'folder/echo', name: 'Renamed' },
            ],
            [CHANNELS.collectionCreate, { workspaceId: 'ws', parent: '', name: 'New folder' }],
            [CHANNELS.collectionDelete, { workspaceId: 'ws', path: 'folder/echo' }],
            [CHANNELS.collectionReadItem, { workspaceId: 'ws', path: 'folder/echo' }],
            [
                CHANNELS.collectionWriteItem,
                { workspaceId: 'ws', path: 'folder/echo', fields: { kind: 'echo', name: 'Echo' } },
            ],
        ]);
    });

    it('answers the search with the hits it validated', async () => {
        const answer = {
            ok: true,
            value: [
                {
                    line: 3,
                    resource: 'mandor://local/ws/doc/guide',
                    source: 'doc',
                },
            ],
        };
        const ipc = spyBridgeIpc({ [CHANNELS.collectionSearch]: answer });
        const bridge = createCollectionsBridge(createBridgeCall(ipc));

        await expect(bridge.search({ workspaceId: 'ws', query: 'guide' })).resolves.toEqual(answer);
        expect(ipc.calls).toEqual([
            [CHANNELS.collectionSearch, { workspaceId: 'ws', query: 'guide' }],
        ]);
    });

    /**
     * The search answer is validated at this edge, where the schema of the channel exists; a hit
     * that lies about where it was found is not believed.
     */
    it('refuses a search answer that does not match the contract', async () => {
        const ipc = spyBridgeIpc({
            [CHANNELS.collectionSearch]: {
                ok: true,
                value: [
                    {
                        line: 0,
                        resource: 'mandor://local/ws/doc/guide',
                        source: 'doc',
                    },
                ],
            },
        });
        const bridge = createCollectionsBridge(createBridgeCall(ipc));

        await expect(bridge.search({ workspaceId: 'ws', query: 'guide' })).rejects.toThrow();
    });

    /** A refusal is data too, and it belongs to the `ok: false` branch of the same contract. */
    it('hands a refusal of the search through', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createCollectionsBridge(createBridgeCall(ipc));

        await expect(bridge.search({ workspaceId: 'ws', query: 'guide' })).resolves.toEqual(
            REFUSED,
        );
    });

    it('asks for the chain of a place and validates the levels main answers', async () => {
        const answer = {
            ok: true,
            value: [{ level: 'workspace', place: { kind: 'workspace' }, name: 'W', settings: {} }],
        };
        const ipc = spyBridgeIpc({ [CHANNELS.collectionChain]: answer });
        const bridge = createCollectionsBridge(createBridgeCall(ipc));

        await expect(bridge.chain({ workspaceId: 'ws', parentPath: null })).resolves.toEqual(
            answer,
        );
        expect(ipc.calls).toEqual([
            [CHANNELS.collectionChain, { workspaceId: 'ws', parentPath: null }],
        ]);
    });

    it('sends the patch of a folder to its channel, whole', async () => {
        const ipc = spyBridgeIpc({ [CHANNELS.collectionSettingsWrite]: { ok: true, value: {} } });
        const bridge = createCollectionsBridge(createBridgeCall(ipc));
        const request = { workspaceId: 'ws', path: 'api', patch: { description: 'x' } };

        await expect(bridge.writeSettings(request)).resolves.toEqual({ ok: true, value: {} });
        expect(ipc.calls).toEqual([[CHANNELS.collectionSettingsWrite, request]]);
    });
});
