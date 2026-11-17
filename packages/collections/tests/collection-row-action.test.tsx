import type { CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { MenuItem } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionRowActionDeclarations } from '../src/collection-actions.js';
import { collectionStore } from '../src/collection-store.js';
import { CollectionRowAction } from '../src/components/sidebar/CollectionRowAction.js';
import { CollectionRowMenu } from '../src/components/sidebar/CollectionRowMenu.js';
import { useCollectionRow } from '../src/hooks/useCollectionRow.js';

import { AppProviders } from './support/app-providers.js';

const COLLECTION: CollectionNode = {
    kind: 'collection',
    name: 'Pedidos',
    path: 'pedidos',
    children: [],
};

const FOLDER: CollectionNode = {
    kind: 'folder',
    name: 'Entrantes',
    path: 'pedidos/entrantes',
    children: [],
};

const SELECTED = vi.fn();

/** A line an app would declare: it reads the row it was drawn for, as the apps do. */
function SampleAction() {
    const { node, workspaceId } = useCollectionRow();

    return (
        <MenuItem
            onSelect={() => {
                SELECTED(workspaceId, node.path);
            }}
        >
            {`Sample ${node.name}`}
        </MenuItem>
    );
}

function mount(node: CollectionNode, kind: CollectionNode['kind']): void {
    render(
        <>
            <CollectionRowAction id="sample" kind={kind}>
                <SampleAction />
            </CollectionRowAction>
            <CollectionRowMenu node={node} workspaceId="events" />
        </>,
        { wrapper: AppProviders },
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Row options' }), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    SELECTED.mockClear();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

describe('what the app declares into the menu of the rows (CollectionRowAction)', () => {
    it('draws a line in the menu of the rows of its kind, which reads the row it belongs to', async () => {
        mount(COLLECTION, 'collection');

        fireEvent.click(await screen.findByRole('menuitem', { name: 'Sample Pedidos' }));

        expect(SELECTED).toHaveBeenCalledWith('events', 'pedidos');
    });

    it('leaves the menu of the rows of another kind as it was', async () => {
        mount(FOLDER, 'collection');

        expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'Sample Entrantes' })).toBeNull();
    });

    it('stops being offered when the declaration unmounts', () => {
        const view = render(
            <CollectionRowAction id="sample" kind="collection">
                <SampleAction />
            </CollectionRowAction>,
        );

        expect(collectionRowActionDeclarations.list().map((action) => action.id)).toEqual([
            'sample',
        ]);

        view.unmount();

        expect(collectionRowActionDeclarations.list()).toEqual([]);
    });
});
