import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import type * as Repos from '@mandor/repos';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncApp } from '../../../src/renderer/app/AsyncApp.js';

// Opening the origin is what the window does first and what this file is least about: the boot
// belongs to the package that owns the origins, and it is tested there.
vi.mock('@mandor/repos', async () => {
    const repos = await vi.importActual<typeof Repos>('@mandor/repos');

    return { ...repos, useOriginBoot: () => undefined };
});

/** The window loads its data as it opens; the flush lets those loads land inside act. */
async function renderApp(): Promise<void> {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <AsyncApp />
        </MessagesProvider>,
    );

    await act(() => Promise.resolve());
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(
        success([{ kind: 'collection', name: 'Pedidos', path: 'pedidos', children: [] }]),
    );
    vi.spyOn(bridge.export, 'outline').mockResolvedValue(success({ name: 'Pedidos', nodes: [] }));
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the export of Async (AsyncExportAction, from the line AsyncExportLine)', () => {
    it('is the line of the menu of a collection: the dialog reads that collection as AsyncAPI', async () => {
        await renderApp();

        fireEvent.pointerDown(await screen.findByRole('button', { name: 'Row options' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Export…' }));

        await waitFor(() => {
            expect(bridge.export.outline).toHaveBeenCalledWith({
                workspaceId: 'personal',
                format: 'asyncapi',
                scope: 'collection',
                collection: 'pedidos',
            });
        });
        expect(await screen.findByRole('dialog')).toBeVisible();
        expect(screen.queryByRole('button', { name: /^Format:/u })).toBeNull();
    });

    it('is no button of the workspaces page', async () => {
        await renderApp();

        expect(screen.queryByRole('button', { name: 'Export a document' })).toBeNull();
    });
});
