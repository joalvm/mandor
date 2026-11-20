import type { CollectionNode } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collectionStore } from '../../../src/collection-store.js';
import { COLLECTIONS_SECTION_ID } from '../../../src/components/sidebar/CollectionsSection.js';
import { ItemActionsMenu } from '../../../src/index.js';
import { itemResource } from '../../../src/lib/item-resource.js';
import { AppProviders } from '../../support/app-providers.js';

const WORKSPACE = 'events';

const ITEM: CollectionNode = {
    kind: 'item',
    itemKind: 'message',
    name: 'Pedido creado',
    path: 'pedidos/pedido-creado',
    tags: [],
};

const FOLDER: CollectionNode = {
    kind: 'folder',
    name: 'Pedidos',
    path: 'pedidos',
    children: [ITEM],
};

const RESOURCE = itemResource('local', WORKSPACE, ITEM.path);

/** Radix opens the menu on pointerdown of its trigger, and runs the line on click. */
function openMenu(): void {
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([FOLDER]);
    shellStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

/** The bar of a tab opens the CollectionNodeMenu of the row, the same lines as the tree. */
describe('the more actions of the tab of an item', () => {
    it('offers what the row of the item offers', async () => {
        render(<ItemActionsMenu resource={RESOURCE} />, { wrapper: AppProviders });

        openMenu();

        expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeVisible();
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    });

    /** Renaming happens on the row, so a folded section opens and the tree goes to it. */
    it('brings the row into view before it renames it', async () => {
        shellStore.getState().setPanels({ collapsedSections: [COLLECTIONS_SECTION_ID] });
        render(<ItemActionsMenu resource={RESOURCE} />, { wrapper: AppProviders });

        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        expect(collectionStore.getState().renaming).toBe(ITEM.path);
        expect(shellStore.getState().panels.collapsedSections).toEqual([]);
        expect(shellStore.getState().revealing).toBe(RESOURCE);
    });

    it('brings the row into view before it asks to delete it', async () => {
        render(<ItemActionsMenu resource={RESOURCE} />, { wrapper: AppProviders });

        openMenu();
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

        expect(collectionStore.getState().deleting).toEqual([ITEM.path]);
        expect(shellStore.getState().revealing).toBe(RESOURCE);
    });

    /** A request not saved anywhere has no row, and so nothing to act on. */
    it('draws nothing for an item the tree does not hold', () => {
        render(<ItemActionsMenu resource={itemResource('local', WORKSPACE, 'suelto')} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('button')).toBeNull();
    });

    /** It is a stop of the tab key, the way every button on the bar is. */
    it('keeps its button in the order of the tab key', () => {
        render(<ItemActionsMenu resource={RESOURCE} />, { wrapper: AppProviders });

        expect(screen.getByRole('button', { name: 'More actions' })).not.toHaveAttribute(
            'tabindex',
            '-1',
        );
    });
});
