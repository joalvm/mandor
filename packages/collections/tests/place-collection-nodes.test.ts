import { failure, ROOT_GROUP_ID, success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/index.js';
import { nodeAt } from '../src/lib/node-at.js';
import { placeCollectionNodes } from '../src/lib/place-collection-nodes.js';

import { TWO_FOLDERS } from './support/two-folders.js';

const ENVIO = 'mandor://local-apis/events/item/envios/envio-creado';
const LANDED = 'mandor://local-apis/events/item/pedidos/envios/envio-creado';

function item(path: string): CollectionNode {
    return { kind: 'item', itemKind: 'message', name: path, path, tags: [] };
}

/** The tree once «Envios» went inside «Pedidos», as the disk hands it back afterwards. */
const ENVIOS_INSIDE: CollectionNode[] = [
    {
        kind: 'folder',
        name: 'Pedidos',
        path: 'pedidos',
        children: [
            item('pedidos/pedido-creado'),
            item('pedidos/pedido-pagado'),
            {
                kind: 'folder',
                name: 'Envios',
                path: 'pedidos/envios',
                children: [item('pedidos/envios/envio-creado')],
            },
        ],
    },
];

function nodesAt(...paths: string[]): CollectionNode[] {
    return paths.map((path) => nodeAt(TWO_FOLDERS, path)).filter((node) => node !== null);
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(TWO_FOLDERS);
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    shellStore.getState().reset();
});

describe('placing many entries of the collection at once (placeCollectionNodes)', () => {
    /** Each lands above the same sibling, so they end up together and in the order they had. */
    it('puts them one after another at the same spot, and reads the tree once at the end', async () => {
        const reorder = vi.spyOn(bridge.collections, 'reorder').mockResolvedValue(success({}));
        const move = vi.spyOn(bridge.collections, 'move').mockResolvedValue(success({}));
        const tree = vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
        const spot = { parent: 'pedidos', before: 'pedido-pagado' };

        await placeCollectionNodes(
            'events',
            nodesAt('pedidos/pedido-creado', 'envios/envio-creado'),
            spot,
        );

        expect(reorder).toHaveBeenCalledWith({
            workspaceId: 'events',
            parent: 'pedidos',
            name: 'pedido-creado',
            before: 'pedido-pagado',
        });
        expect(move).toHaveBeenCalledWith({
            workspaceId: 'events',
            from: 'envios/envio-creado',
            kind: 'item',
            to: 'pedidos/envio-creado',
            before: 'pedido-pagado',
        });
        expect(reorder.mock.invocationCallOrder[0]).toBeLessThan(
            move.mock.invocationCallOrder[0] ?? 0,
        );
        expect(tree).toHaveBeenCalledTimes(1);
    });

    it('stops at the first refusal, says why, and still reads the tree again', async () => {
        const move = vi
            .spyOn(bridge.collections, 'move')
            .mockResolvedValue(failure('name-taken', 'taken'));
        const tree = vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(TWO_FOLDERS));
        const spot = { parent: '', before: null };

        await placeCollectionNodes(
            'events',
            nodesAt('pedidos/pedido-creado', 'envios/envio-creado'),
            spot,
        );

        expect(move).toHaveBeenCalledTimes(1);
        expect(collectionStore.getState().error).toBe('name-taken');
        expect(tree).toHaveBeenCalledTimes(1);
    });

    it('walks the tabs of what a folder carried over to where it landed', async () => {
        vi.spyOn(bridge.collections, 'move').mockResolvedValue(success({}));
        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(ENVIOS_INSIDE));
        shellStore.getState().openTab(ROOT_GROUP_ID, { id: 'one', kind: 'item', resource: ENVIO });

        await placeCollectionNodes('events', nodesAt('envios'), {
            parent: 'pedidos',
            before: null,
        });

        expect(shellStore.getState().resources[LANDED]?.tabs).toEqual(['one']);
    });

    /** Taken before the move, taken after it: the selection follows the nodes, not the paths. */
    it('keeps what was taken taken, at the paths it landed on', async () => {
        vi.spyOn(bridge.collections, 'move').mockResolvedValue(success({}));
        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(ENVIOS_INSIDE));
        collectionStore
            .getState()
            .setSelected(['envios', 'envios/envio-creado', 'pedidos/pedido-pagado']);

        await placeCollectionNodes('events', nodesAt('envios'), {
            parent: 'pedidos',
            before: null,
        });

        expect(collectionStore.getState().selected).toEqual([
            'pedidos/envios',
            'pedidos/envios/envio-creado',
            'pedidos/pedido-pagado',
        ]);
    });
});
