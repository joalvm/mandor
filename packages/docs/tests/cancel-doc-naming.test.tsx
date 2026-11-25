import { success } from '@mandor/ipc';
import { bridge, selectOpenResources, shellStore, Sidebar } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocsSection, WorkspaceDocs } from '../src/index.js';
import { docsStore } from '../src/docs-store.js';

import { AppProviders } from './support/app-providers.js';

const README = { name: 'readme.md', title: 'readme' };

const BORN = { name: 'new-doc.md', title: 'New doc' };

const BORN_RESOURCE = 'mandor://local-apis/events/doc/new-doc.md';

function renderDocs(): void {
    render(
        <>
            <WorkspaceDocs />
            <DocsSection order={10} />
            <Sidebar />
        </>,
        { wrapper: AppProviders },
    );
}

/** Makes a doc from the button of the section, and hands back the field that names it. */
async function makeDoc(): Promise<HTMLElement> {
    const list = vi.mocked(bridge.doc.list);

    vi.spyOn(bridge.doc, 'create').mockImplementation(() => {
        list.mockResolvedValue(success([README, BORN]));

        return Promise.resolve(success(BORN.name));
    });
    renderDocs();
    await screen.findByRole('option', { name: 'readme' });
    fireEvent.click(screen.getByRole('button', { name: 'New doc' }));

    return screen.findByRole('textbox', { name: 'New name' });
}

beforeEach(() => {
    vi.restoreAllMocks();
    docsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(bridge.doc, 'list').mockResolvedValue(success([README]));
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

/** What cancel-doc-naming does with a doc whose name field is the first one it ever had. */
describe('Escape on the name of a doc just made', () => {
    it('takes the doc back and closes the tab it opened', async () => {
        const remove = vi.spyOn(bridge.doc, 'delete').mockImplementation(() => {
            vi.mocked(bridge.doc.list).mockResolvedValue(success([README]));

            return Promise.resolve(success({}));
        });
        const field = await makeDoc();

        expect(selectOpenResources(shellStore.getState())).toContain(BORN_RESOURCE);

        fireEvent.keyDown(field, { key: 'Escape' });

        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith({ name: BORN.name, workspaceId: 'events' });
        });
        await waitFor(() => {
            expect(screen.queryByRole('option', { name: 'New doc' })).toBeNull();
        });
        expect(selectOpenResources(shellStore.getState())).not.toContain(BORN_RESOURCE);
    });

    it('keeps it, and its tab, when the focus leaves the field instead', async () => {
        const remove = vi.spyOn(bridge.doc, 'delete').mockResolvedValue(success({}));
        const field = await makeDoc();

        vi.spyOn(bridge.doc, 'rename').mockResolvedValue(success({}));
        act(() => {
            field.blur();
        });

        expect(await screen.findByRole('option', { name: 'New doc' })).toBeVisible();
        expect(selectOpenResources(shellStore.getState())).toContain(BORN_RESOURCE);
        expect(remove).not.toHaveBeenCalled();
    });
});
