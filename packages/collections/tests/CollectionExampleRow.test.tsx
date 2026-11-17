import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore, CollectionSidebar, WorkspaceCollection } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';
import {
    declareRequestWithExamples,
    EXAMPLE_CREADO,
    EXAMPLE_ROTO,
    exampleSpies,
    WITH_EXAMPLES,
} from './support/login-with-examples.js';

let spies = exampleSpies();
let undo: () => void = () => undefined;

async function renderTree(): Promise<void> {
    render(
        <>
            <WorkspaceCollection />
            <CollectionSidebar />
        </>,
        { wrapper: AppProviders },
    );

    await screen.findAllByRole('treeitem');
}

function row(name: string): HTMLElement {
    return screen.getByRole('treeitem', { name });
}

/** The click on the chevron of a line: the gutter its row reserves for it. */
function pressGutter(name: string): void {
    row(name)
        .querySelectorAll('[data-part="row-gutter"]')
        .forEach((gutter) => {
            fireEvent.click(gutter);
        });
}

function openRowMenu(name: string): void {
    fireEvent.pointerDown(within(row(name)).getByRole('button', { name: 'Row options' }), {
        button: 0,
        ctrlKey: false,
    });
}

function type(field: HTMLElement, value: string): void {
    field.textContent = value;
    fireEvent.input(field);
    fireEvent.keyDown(field, { key: 'Enter' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(success(WITH_EXAMPLES));
    spies = exampleSpies();
    undo = declareRequestWithExamples(spies);
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    undo();
    shellStore.getState().reset();
});

describe('CollectionExampleRow: the examples of a request in the tree', () => {
    it('draws one line for each example one level further in, without anybody opening the request', async () => {
        await renderTree();

        expect(screen.getAllByRole('treeitem')).toHaveLength(4);
        expect(row('Login')).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('201')).toBeVisible();
        expect(screen.getByText('Roto')).toBeVisible();
    });

    it('draws the chevron on the request that has examples, and on no example', async () => {
        await renderTree();

        expect(
            row('Login').querySelector('[data-part="row-gutter"] [data-part="icon"]'),
        ).not.toBeNull();
        expect(
            row('Creado').querySelector('[data-part="row-gutter"] [data-part="icon"]'),
        ).toBeNull();
    });

    it('closes and opens them with the click on the chevron, without opening the request', async () => {
        await renderTree();
        pressGutter('Login');

        expect(screen.getAllByRole('treeitem')).toHaveLength(2);
        expect(spies.open).not.toHaveBeenCalled();

        pressGutter('Login');

        expect(screen.getAllByRole('treeitem')).toHaveLength(4);
    });

    it('closes them with the arrow to the left, and opens them again with the one to the right', async () => {
        await renderTree();
        fireEvent.keyDown(row('Login'), { key: 'ArrowLeft' });

        expect(screen.getAllByRole('treeitem')).toHaveLength(2);
        expect(collectionStore.getState().examplesClosed['events']).toEqual(['acceso/login']);

        fireEvent.keyDown(row('Login'), { key: 'ArrowRight' });

        expect(screen.getAllByRole('treeitem')).toHaveLength(4);
    });

    it('asks the kind of the request to open an example looked at with a click', async () => {
        await renderTree();
        fireEvent.click(row('Roto'));

        expect(spies.open).toHaveBeenCalledWith(EXAMPLE_ROTO, { beside: false, preview: true });
    });

    it('opens the rename field of an example on F2, and renames it through the app', async () => {
        await renderTree();
        fireEvent.keyDown(row('Roto'), { code: 'F2', key: 'F2' });
        type(screen.getByRole('textbox', { name: 'New name' }), 'Caído');

        await waitFor(() => {
            expect(spies.rename).toHaveBeenCalledWith(EXAMPLE_ROTO, 'Caído');
        });
        expect(collectionStore.getState().renaming).toBeNull();
    });

    it('duplicates the example that is the one thing taken with Ctrl and D', async () => {
        await renderTree();
        fireEvent.click(row('Roto'));
        fireEvent.keyDown(row('Roto'), { code: 'KeyD', ctrlKey: true, key: 'd' });

        await waitFor(() => {
            expect(spies.duplicate).toHaveBeenCalledWith(EXAMPLE_ROTO);
        });
    });

    it('lets go of the taken example when a read of the tree no longer lists it', async () => {
        await renderTree();
        fireEvent.click(row('Roto'));

        expect(collectionStore.getState().selected).toEqual(['acceso/login:Roto']);
        act(() => {
            collectionStore.getState().setNodes([]);
        });

        expect(collectionStore.getState().selected).toEqual([]);
    });

    it('asks, and hands the example to the app, when Delete is pressed on it', async () => {
        await renderTree();
        fireEvent.click(row('Creado'));
        fireEvent.keyDown(row('Creado'), { key: 'Delete' });
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(spies.remove).toHaveBeenCalledWith([EXAMPLE_CREADO]);
        });
    });
});

describe('CollectionExampleMenu: the menu of an example', () => {
    it('has the five lines an example is given', async () => {
        await renderTree();
        openRowMenu('Creado');

        const names = (await screen.findAllByRole('menuitem')).map((item) => item.textContent);

        expect(names).toEqual([
            'Open',
            'Open to the side',
            'RenameF2',
            'DuplicateCtrl+D',
            'DeleteDelete',
        ]);
    });

    it('opens it to the side, and kept, from the second line', async () => {
        await renderTree();
        openRowMenu('Creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Open to the side' }));

        expect(spies.open).toHaveBeenCalledWith(EXAMPLE_CREADO, { beside: true, preview: false });
    });

    it('opens it where the focus is, and kept, from the first line', async () => {
        await renderTree();
        openRowMenu('Creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Open' }));

        expect(spies.open).toHaveBeenCalledWith(EXAMPLE_CREADO, { beside: false, preview: false });
    });

    it('duplicates it from the menu through the app', async () => {
        await renderTree();
        openRowMenu('Creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: /Duplicate/u }));

        await waitFor(() => {
            expect(spies.duplicate).toHaveBeenCalledWith(EXAMPLE_CREADO);
        });
    });

    it('asks about deleting it, naming it', async () => {
        await renderTree();
        openRowMenu('Creado');
        fireEvent.click(await screen.findByRole('menuitem', { name: /Delete/u }));

        expect(await screen.findByRole('alertdialog')).toHaveTextContent('"Creado"');
    });
});

describe('CollectionExampleMenu: a kind that declared no examples', () => {
    it('draws the lines of the examples the tree listed, without a menu on them', async () => {
        undo();
        undo = declareRequestWithExamples(undefined);
        await renderTree();

        expect(screen.getAllByRole('treeitem')).toHaveLength(4);
        expect(within(row('Creado')).queryByRole('button', { name: 'Row options' })).toBeNull();
    });
});
