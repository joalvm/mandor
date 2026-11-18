import { success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceDocs } from '../src/index.js';
import { DocsSidebar } from '../src/components/sidebar/DocsSidebar.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = 'mandor://local-apis/events/doc/readme.md';

async function renderList(): Promise<void> {
    render(
        <>
            <WorkspaceDocs />
            <DocsSidebar />
        </>,
        { wrapper: AppProviders },
    );

    await screen.findByRole('option', { name: 'readme' });
}

/** Row actions live behind a menu, so a test opens the one of the row it means. */
function openRowMenu(name: string): void {
    const row = screen.getByRole('option', { name });

    fireEvent.pointerDown(within(row).getByRole('button', { name: 'Row options' }), {
        button: 0,
        ctrlKey: false,
    });
}

function type(value: string): void {
    const field = screen.getByRole('textbox', { name: 'New name' });

    field.textContent = value;
    fireEvent.input(field);
    fireEvent.keyDown(field, { key: 'Enter' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([
            { name: 'k3m9x2q7a4bd.md', title: 'notas' },
            { name: 'readme.md', title: 'readme' },
        ]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the list of docs', () => {
    /** The file is the address of the doc, and an address is not something the list draws. */
    it('calls each doc by its title and never by the file it lives in', async () => {
        await renderList();

        expect(screen.getByRole('option', { name: 'notas' })).toBeVisible();
        expect(screen.queryByRole('option', { name: 'k3m9x2q7a4bd.md' })).toBeNull();
        expect(screen.queryByText('k3m9x2q7a4bd', { exact: false })).toBeNull();
    });
});

describe('renaming a doc in place', () => {
    it('opens the field on the row, with the title in it and not the file name', async () => {
        await renderList();
        openRowMenu('readme');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

        expect(screen.getByRole('textbox', { name: 'New name' })).toHaveTextContent('readme');
    });

    it('sends the typed title for the file of the row', async () => {
        const rename = vi.spyOn(bridge.doc, 'rename').mockResolvedValue(success({}));

        await renderList();
        openRowMenu('readme');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
        type('Guía');

        await waitFor(() => {
            expect(rename).toHaveBeenCalledWith({
                name: 'readme.md',
                title: 'Guía',
                workspaceId: 'events',
            });
        });
    });

    /** The file does not move, so the tab stays on it and only the word it wears changes. */
    it('keeps the open tab on its file and shows the new title in the list', async () => {
        vi.spyOn(bridge.doc, 'rename').mockResolvedValue(success({}));
        vi.spyOn(bridge.doc, 'read').mockResolvedValue(success('# Readme'));

        await renderList();
        fireEvent.click(screen.getByRole('option', { name: 'readme' }));

        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([README]);

        vi.mocked(bridge.doc.list).mockResolvedValue(
            success([
                { name: 'k3m9x2q7a4bd.md', title: 'notas' },
                { name: 'readme.md', title: 'Guía' },
            ]),
        );
        openRowMenu('readme');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
        type('Guía');

        expect(await screen.findByRole('option', { name: 'Guía' })).toBeVisible();
        expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([README]);
    });

    /** The same title again is nothing to do, and writing the file for it would only dirty it. */
    it('asks nothing of disk for a title that did not change', async () => {
        const rename = vi.spyOn(bridge.doc, 'rename').mockResolvedValue(success({}));

        await renderList();
        openRowMenu('readme');
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
        type('readme');

        await waitFor(() => {
            expect(docsStore.getState().renaming).toBeNull();
        });
        expect(rename).not.toHaveBeenCalled();
    });
});
