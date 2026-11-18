import { collectionStore, itemResource } from '@mandor/collections';
import { leavesOf, ROOT_GROUP_ID, success } from '@mandor/ipc';
import { REQUEST_ITEM_KIND, type CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SaveRequestDialog } from '../../../../src/renderer/features/requests/components/save/SaveRequestDialog.js';
import { openLooseRequest } from '../../../../src/renderer/features/requests/lib/open-loose-request.js';
import { saveAnyRequest } from '../../../../src/renderer/features/requests/lib/save-any-request.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { saveToQuestion } from '../../../../src/renderer/features/requests/save-to-question.js';
import { AppProviders } from '../../support/app-providers.js';

const PEDIDOS: CollectionNode = {
    children: [],
    kind: 'collection',
    name: 'Pedidos',
    path: 'pedidos',
};

const NEW_FOLDER: CollectionNode = {
    children: [],
    kind: 'folder',
    name: 'New folder',
    path: 'pedidos/new-folder',
};

function openTabs() {
    return leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs);
}

/** A request saved nowhere, open in its tab, and the Ctrl+S that asks where it goes. */
function askForLoose(): { asked: ReturnType<typeof saveAnyRequest>; resource: string } {
    openLooseRequest(ROOT_GROUP_ID, 'New request');

    const resource = openTabs()[0]?.resource ?? '';

    render(<SaveRequestDialog />, { wrapper: AppProviders });

    let asked: ReturnType<typeof saveAnyRequest> = Promise.resolve(null);

    act(() => {
        asked = saveAnyRequest(resource);
    });

    return { asked, resource };
}

/** The question leaves the window once its answer is in. */
async function answered(): Promise<void> {
    await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
    });
}

function dialog() {
    return screen.getByRole('dialog', { name: 'Save to…' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([PEDIDOS]);
    requestsStore.getState().reset();
    saveToQuestion.setState({ asking: null });
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    vi.spyOn(window.mandor.collections, 'tree').mockResolvedValue(success([PEDIDOS]));
});

afterEach(() => {
    cleanup();
    collectionStore.getState().reset();
    requestsStore.getState().reset();
    saveToQuestion.setState({ asking: null });
    shellStore.getState().reset();
});

describe('saving a request saved nowhere (SaveRequestDialog, useSaveTo)', () => {
    it('puts it in the place chosen, under the name typed, and the tab goes on as the item', async () => {
        const create = vi
            .spyOn(window.mandor.collections, 'create')
            .mockResolvedValue(success('pedidos/listar'));

        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));

        const { asked } = askForLoose();
        const name = within(dialog()).getByRole('textbox', { name: 'Name' });

        expect(name.textContent).toBe('New request');

        fireEvent.input(name, { target: { textContent: 'Listar' } });
        fireEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));
        await answered();

        await expect(asked).resolves.toBeNull();
        expect(create).toHaveBeenCalledWith({
            itemKind: REQUEST_ITEM_KIND,
            name: 'Listar',
            parent: 'pedidos',
            workspaceId: 'local',
        });
        expect(openTabs().map((tab) => tab.resource)).toEqual([
            itemResource('Local', 'local', 'pedidos/listar'),
        ]);
    });

    it('keeps it where it was when cancelled', async () => {
        const create = vi.spyOn(window.mandor.collections, 'create');
        const { asked, resource } = askForLoose();

        fireEvent.click(within(dialog()).getAllByRole('button', { name: 'Cancel' })[0] as Element);

        await expect(asked).resolves.toBe('kept');
        expect(create).not.toHaveBeenCalled();
        expect(openTabs().map((tab) => tab.resource)).toEqual([resource]);
    });

    it('makes a folder in the place chosen and chooses it', async () => {
        const create = vi
            .spyOn(window.mandor.collections, 'create')
            .mockResolvedValue(success('pedidos/new-folder'));

        vi.spyOn(window.mandor.collections, 'tree').mockResolvedValue(
            success([{ ...PEDIDOS, children: [NEW_FOLDER] }]),
        );
        askForLoose();
        fireEvent.click(within(dialog()).getByRole('button', { name: 'New folder' }));

        await waitFor(() => {
            expect(within(dialog()).getByRole('treeitem', { name: 'New folder' })).toHaveProperty(
                'ariaSelected',
                'true',
            );
        });
        expect(create).toHaveBeenCalledWith({
            name: 'New folder',
            parent: 'pedidos',
            workspaceId: 'local',
        });
    });

    it('makes a collection first when the workspace has none to go into', async () => {
        collectionStore.getState().setNodes([]);

        const create = vi
            .spyOn(window.mandor.collections, 'create')
            .mockResolvedValueOnce(success('new-collection'))
            .mockResolvedValueOnce(success('new-collection/new-request'));

        vi.spyOn(window.mandor.collections, 'writeItem').mockResolvedValue(success({}));

        const { asked } = askForLoose();

        fireEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));
        await answered();

        await expect(asked).resolves.toBeNull();
        expect(create).toHaveBeenNthCalledWith(1, {
            name: 'New collection',
            parent: '',
            workspaceId: 'local',
        });
        expect(create).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ parent: 'new-collection' }),
        );
    });
});

describe('the question «Save to…» (save-to-question)', () => {
    it('is asked once at a time: a second ask keeps the first where it was', async () => {
        const first = saveToQuestion.getState().ask('mandor://local/local/loose/a', true);

        const second = saveToQuestion.getState().ask('mandor://local/local/loose/b', true);

        await expect(first).resolves.toBe(false);
        expect(saveToQuestion.getState().asking?.resource).toBe('mandor://local/local/loose/b');

        saveToQuestion.getState().answer(true);

        await expect(second).resolves.toBe(true);
    });
});
