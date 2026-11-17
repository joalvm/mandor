import { DocIcon } from '@mandor/icons';
import { failure, success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { createCollectionNode } from '../src/lib/create-collection-node.js';

import { declareItemKind } from './support/declare-item-kind.js';
import { TWO_FOLDERS } from './support/two-folders.js';

const WORKSPACE = 'events';

const UNREGISTER: (() => void)[] = [];

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE });
    collectionStore.getState().setNodes(TWO_FOLDERS);
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
});

afterEach(() => {
    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }

    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('making a node of the collection', () => {
    it('makes it at once under the word it is born with, and leaves its row naming it', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('new-collection'));

        await createCollectionNode(WORKSPACE, {
            itemKind: null,
            name: 'New collection',
            parent: '',
        });

        expect(create).toHaveBeenCalledWith({
            workspaceId: WORKSPACE,
            parent: '',
            name: 'New collection',
        });
        expect(collectionStore.getState().renaming).toBe('new-collection');
    });

    it('numbers the word when a sibling already wears it', async () => {
        const create = vi
            .spyOn(bridge.collections, 'create')
            .mockResolvedValue(success('pedidos/pedido-creado-2'));

        await createCollectionNode(WORKSPACE, {
            itemKind: null,
            name: 'Pedido creado',
            parent: 'pedidos',
        });

        expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pedido creado 2' }));
    });

    it('opens the tab of a new item and leaves its row as it is', async () => {
        UNREGISTER.push(
            declareItemKind({ id: 'message', component: DocIcon, newLabel: 'collections:newItem' }),
        );
        vi.spyOn(bridge.collections, 'create').mockResolvedValue(success('pedidos/new-item'));

        const openTab = vi.spyOn(shellStore.getState(), 'openTab');

        await createCollectionNode(WORKSPACE, {
            itemKind: 'message',
            name: 'New item',
            parent: 'pedidos',
        });

        expect(openTab).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ id: `item-${WORKSPACE}-pedidos/new-item` }),
            { preview: false },
        );
        expect(collectionStore.getState().renaming).toBeNull();
    });

    it('says what refused it, and names nothing', async () => {
        vi.spyOn(bridge.collections, 'create').mockResolvedValue(failure('name-taken', 'taken'));

        await createCollectionNode(WORKSPACE, { itemKind: null, name: 'Otro', parent: 'nada' });

        expect(collectionStore.getState().error).toBe('name-taken');
        expect(collectionStore.getState().renaming).toBeNull();
    });
});
