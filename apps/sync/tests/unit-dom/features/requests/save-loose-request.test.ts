import { collectionStore, itemResource } from '@mandor/collections';
import { failure, leavesOf, ROOT_GROUP_ID, success } from '@mandor/ipc';
import { createRequestItem, REQUEST_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { folderLines } from '../../../../src/renderer/features/requests/lib/folder-lines.js';
import { looseBecomesItem } from '../../../../src/renderer/features/requests/lib/loose-becomes-item.js';
import { makePlace } from '../../../../src/renderer/features/requests/lib/make-place.js';
import { openLooseRequest } from '../../../../src/renderer/features/requests/lib/open-loose-request.js';
import { saveLooseRequest } from '../../../../src/renderer/features/requests/lib/save-loose-request.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const NODES: CollectionNode[] = [
    {
        children: [
            {
                children: [],
                kind: 'folder',
                name: 'Crear',
                path: 'pedidos/crear',
            },
            {
                itemKind: REQUEST_ITEM_KIND,
                kind: 'item',
                name: 'Listar',
                path: 'pedidos/listar',
                tags: [],
            },
        ],
        kind: 'collection',
        name: 'Pedidos',
        path: 'pedidos',
    },
];

function openTabs() {
    return leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs);
}

/** A request saved nowhere, edited once: the draft the save puts on disk. */
function looseEdited(): string {
    openLooseRequest(ROOT_GROUP_ID, 'New request', (blank) => ({ ...blank, method: 'POST' }));

    return openTabs()[0]?.resource ?? '';
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes(NODES);
    requestsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    vi.spyOn(window.mandor.collections, 'tree').mockResolvedValue(success(NODES));
});

afterEach(() => {
    collectionStore.getState().reset();
    requestsStore.getState().reset();
    shellStore.getState().reset();
});

describe('putting a request saved nowhere into the collection', () => {
    it('makes the item under the name chosen and writes the request as it stands', async () => {
        const resource = looseEdited();
        const create = vi
            .spyOn(window.mandor.collections, 'create')
            .mockResolvedValue(success('pedidos/k3m9x2q7a4bd'));
        const writeItem = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        const saved = await saveLooseRequest({ name: ' Listar ', parent: 'pedidos', resource });

        expect(saved).toEqual(success('pedidos/k3m9x2q7a4bd'));
        expect(create).toHaveBeenCalledWith({
            itemKind: REQUEST_ITEM_KIND,
            name: 'Listar',
            parent: 'pedidos',
            workspaceId: 'local',
        });
        const written = writeItem.mock.calls[0]?.[0];

        expect(written?.path).toBe('pedidos/k3m9x2q7a4bd');
        expect(written?.fields).toMatchObject({ method: 'POST', name: 'Listar' });

        const item = itemResource('Local', 'local', 'pedidos/k3m9x2q7a4bd');

        expect(requestsStore.getState().requests[item]?.name).toBe('Listar');
        expect(requestsStore.getState().pendings[resource]).toBeUndefined();
    });

    it('keeps the name it wore when none is typed', async () => {
        const resource = looseEdited();
        const create = vi
            .spyOn(window.mandor.collections, 'create')
            .mockResolvedValue(success('pedidos/new-request'));

        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));
        await saveLooseRequest({ name: '  ', parent: 'pedidos', resource });

        expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'New request' }));
    });

    it('keeps the draft when the collection refuses it', async () => {
        const resource = looseEdited();

        vi.spyOn(window.mandor.collections, 'create').mockResolvedValue(
            failure('fs-write', 'disk full'),
        );

        const saved = await saveLooseRequest({ name: 'Listar', parent: 'pedidos', resource });

        expect(saved.ok).toBe(false);
        expect(requestsStore.getState().pendings[resource]).toBeDefined();
    });

    it('answers a fault when the request is no longer in the window', async () => {
        const saved = await saveLooseRequest({
            name: 'Listar',
            parent: 'pedidos',
            resource: 'mandor://local/local/loose/gone',
        });

        expect(saved.ok).toBe(false);
    });
});

describe('the tab of a request that was just saved (loose-becomes-item)', () => {
    it('goes on as the item, and the loose tab leaves', () => {
        const resource = looseEdited();

        requestsStore.getState().setRequest(resource, createRequestItem({ name: 'Listar' }));
        looseBecomesItem(resource, 'pedidos/listar');

        expect(openTabs().map((tab) => tab.resource)).toEqual([
            itemResource('Local', 'local', 'pedidos/listar'),
        ]);
    });
});

describe('making a place for a request (make-place)', () => {
    it('makes a folder under the word, numbered when a sibling wears it', async () => {
        const create = vi
            .spyOn(window.mandor.collections, 'create')
            .mockResolvedValue(success('pedidos/crear-2'));

        const made = await makePlace('local', 'pedidos', 'Crear');

        expect(made).toEqual(success('pedidos/crear-2'));
        expect(create).toHaveBeenCalledWith({
            name: 'Crear 2',
            parent: 'pedidos',
            workspaceId: 'local',
        });
    });
});

describe('the places a request can go (folder-lines)', () => {
    it('lists collections and folders, never items, and folds only what holds a folder', () => {
        expect(folderLines(NODES, new Set())).toEqual([
            { expanded: true, id: 'pedidos', kind: 'collection', level: 1, name: 'Pedidos' },
            { expanded: undefined, id: 'pedidos/crear', kind: 'folder', level: 2, name: 'Crear' },
        ]);
    });

    it('leaves out what a folded place holds', () => {
        expect(folderLines(NODES, new Set(['pedidos'])).map((line) => line.id)).toEqual([
            'pedidos',
        ]);
    });
});
