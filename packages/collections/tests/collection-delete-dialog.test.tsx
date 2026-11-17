import { success } from '@mandor/ipc';
import type { CollectionNode } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../src/collection-store.js';
import { CollectionDeleteDialog } from '../src/components/sidebar/CollectionDeleteDialog.js';

import { AppProviders } from './support/app-providers.js';
import {
    EXAMPLE_ROTO,
    declareRequestWithExamples,
    exampleSpies,
    WITH_EXAMPLES,
} from './support/login-with-examples.js';
import { TWO_FOLDERS } from './support/two-folders.js';

/** The question is asked through the store: the row menu and the Delete key both write there. */
function ask(paths: string[], nodes: CollectionNode[] = TWO_FOLDERS): void {
    collectionStore.getState().setNodes(nodes);
    collectionStore.getState().setDeleting(paths);
    render(<CollectionDeleteDialog workspaceId="events" />, { wrapper: AppProviders });
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

const TWO_FOLDERS_AND_ACCESO: CollectionNode[] = [...WITH_EXAMPLES, ...TWO_FOLDERS];

describe('the question before anything leaves the collection (CollectionDeleteDialog)', () => {
    it('names the entry when it asks about one', async () => {
        ask(['pedidos']);

        expect(
            await screen.findByRole('alertdialog', { name: 'Delete from the collections' }),
        ).toHaveTextContent('"Pedidos" and everything inside it');
    });

    it('counts the entries when it asks about many', async () => {
        ask(['pedidos/pedido-creado', 'envios']);

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('2 entries');
    });

    /** A folder taken along with something inside it is one deletion, and the question says so. */
    it('asks about a folder alone when what it holds is taken too', async () => {
        ask(['pedidos', 'pedidos/pedido-creado']);

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('"Pedidos"');
    });

    it('deletes every one of them once the answer is yes, and closes', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete').mockResolvedValue(success({}));

        vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));
        ask(['pedidos', 'envios']);
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(remove).toHaveBeenCalledTimes(2);
        });
        expect(collectionStore.getState().deleting).toBeNull();
    });

    it('deletes nothing when the answer is no', async () => {
        const remove = vi.spyOn(bridge.collections, 'delete');

        ask(['pedidos']);
        fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

        expect(remove).not.toHaveBeenCalled();
        expect(collectionStore.getState().deleting).toBeNull();
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('asks nothing when no node answers to what was handed over', () => {
        ask(['gone']);

        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    describe('with examples among what is asked about', () => {
        it('names the example when it is the one thing asked about', async () => {
            ask(['acceso/login:Roto'], WITH_EXAMPLES);

            expect(await screen.findByRole('alertdialog')).toHaveTextContent('"Roto" leaves');
        });

        it('counts examples when only examples are asked about', async () => {
            ask(['acceso/login:Roto', 'acceso/login:Creado'], WITH_EXAMPLES);

            expect(await screen.findByRole('alertdialog')).toHaveTextContent('2 examples');
        });

        it('counts entries when examples are asked about with something else', async () => {
            ask(['acceso/login:Roto', 'acceso'], TWO_FOLDERS_AND_ACCESO);

            expect(await screen.findByRole('alertdialog')).toHaveTextContent('"Acceso"');
        });

        it('hands the examples to the app once the answer is yes', async () => {
            const spies = exampleSpies();
            const undo = declareRequestWithExamples(spies);

            vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success([]));
            ask(['acceso/login:Roto'], WITH_EXAMPLES);
            fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

            await waitFor(() => {
                expect(spies.remove).toHaveBeenCalledWith([EXAMPLE_ROTO]);
            });
            undo();
        });
    });
});
