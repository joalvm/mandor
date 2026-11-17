import { failure, ROOT_GROUP_ID, success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/index.js';
import { removeCollectionNodes } from '../src/lib/remove-collection-nodes.js';

import { TWO_FOLDERS } from './support/two-folders.js';

const PEDIDO = 'mandor://local-apis/events/item/pedidos/pedido-creado';

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('deleting many entries of the collection (removeCollectionNodes)', () => {
    it('deletes them one after another, and reads the tree once at the end', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));
        const tree = vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));

        await removeCollectionNodes('events', TWO_FOLDERS);

        expect(remove.mock.calls.map(([request]) => request.path)).toEqual(['pedidos', 'envios']);
        expect(tree).toHaveBeenCalledTimes(1);
    });

    it('leaves the tabs of every deleted item open, marked as looking at nothing', async () => {
        vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));
        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));
        shellStore.getState().openTab(ROOT_GROUP_ID, { id: 'one', kind: 'item', resource: PEDIDO });

        await removeCollectionNodes('events', TWO_FOLDERS);

        expect(shellStore.getState().resources[PEDIDO]?.missing).toBe(true);
    });

    /** What went before the refusal is gone, and the tree read afterwards says so. */
    it('stops at the first refusal, says why, and still reads the tree again', async () => {
        const remove = vi
            .spyOn(bridge.collections, 'delete')
            .mockResolvedValue(failure('fs-write', 'denied'));
        const tree = vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));

        await removeCollectionNodes('events', TWO_FOLDERS);

        expect(remove).toHaveBeenCalledTimes(1);
        expect(collectionStore.getState().error).toBe('fs-write');
        expect(tree).toHaveBeenCalledTimes(1);
    });
});
