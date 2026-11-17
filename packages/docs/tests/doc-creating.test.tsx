import { failure, success } from '@mandor/ipc';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewDoc } from '../src/components/sidebar/NewDoc.js';
import { WorkspaceDocs } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';
import { DocsSidebar } from '../src/components/sidebar/DocsSidebar.js';

import { AppProviders } from './support/app-providers.js';

const MINTED = 'k3m9x2q7a4bd.md';
const REFUSED = 'Mandor could not save the requested file.';

function renderSection(): void {
    render(
        <>
            <NewDoc />
            <WorkspaceDocs />
            <DocsSidebar />
        </>,
        { wrapper: AppProviders },
    );
}

async function make(): Promise<void> {
    renderSection();
    await screen.findByRole('option', { name: 'readme' });
    // The making settles in act: what disk answers lands while the test still holds the window.
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'New doc' }));
        await Promise.resolve();
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(
        success([{ name: 'readme.md', title: 'readme' }]),
    );
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('making a doc', () => {
    /** An empty `docs/` has no row to open a menu on, and that is when one is most needed. */
    it('makes it at once from the header, under the word it is born with', async () => {
        const create = vi.spyOn(bridge.doc, 'create').mockResolvedValue(success(MINTED));

        await make();

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({ title: 'New doc', workspaceId: 'events' });
        });
    });

    it('is not offered while no workspace is open', () => {
        shellStore.setState({ activeWorkspaceId: null });
        renderSection();

        expect(screen.getByRole('button', { name: 'New doc' })).toBeDisabled();
    });

    it('numbers the word when another doc already wears it', async () => {
        const create = vi.spyOn(bridge.doc, 'create').mockResolvedValue(success(MINTED));

        vi.spyOn(bridge.doc, 'list').mockResolvedValue(
            success([{ name: 'p8w2n5c7e1fg.md', title: 'New doc' }]),
        );
        renderSection();
        await screen.findByRole('option', { name: 'New doc' });
        fireEvent.click(screen.getByRole('button', { name: 'New doc' }));

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({ title: 'New doc 2', workspaceId: 'events' });
        });
    });

    /** Making one is for writing in it, so the tab opens while its row is still being named. */
    it('opens the doc it made and leaves its row naming it', async () => {
        vi.spyOn(bridge.doc, 'create').mockResolvedValue(success(MINTED));
        vi.spyOn(bridge.doc, 'list')
            .mockResolvedValueOnce(success([{ name: 'readme.md', title: 'readme' }]))
            .mockResolvedValue(
                success([
                    { name: MINTED, title: 'New doc' },
                    { name: 'readme.md', title: 'readme' },
                ]),
            );

        await make();

        await waitFor(() => {
            expect(selectTabs(shellStore.getState()).map((tab) => tab.resource)).toEqual([
                `mandor://local-apis/events/doc/${MINTED}`,
            ]);
        });
        expect(docsStore.getState().renaming).toBe(MINTED);
    });

    it('says what disk refused, without losing the list', async () => {
        vi.spyOn(bridge.doc, 'create').mockResolvedValue(failure('fs-write', 'no'));

        await make();

        expect(await screen.findByText(REFUSED)).toBeVisible();
        expect(screen.getByRole('option', { name: 'readme' })).toBeVisible();
    });
});
