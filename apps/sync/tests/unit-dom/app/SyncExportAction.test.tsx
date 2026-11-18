import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { PreferencesProvider } from '@mandor/prefs';
import type * as Repos from '@mandor/repos';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncApp } from '../../../src/renderer/app/SyncApp.js';

// Opening the origin is what the window does first and what this file is least about: the boot
// belongs to the package that owns the origins, and it is tested there.
vi.mock('@mandor/repos', async () => {
    const repos = await vi.importActual<typeof Repos>('@mandor/repos');

    return { ...repos, useOriginBoot: () => undefined };
});

/** The window loads its data as it opens; the flush lets those loads land inside act. */
async function renderApp(): Promise<void> {
    render(
        <PreferencesProvider>
            <MessagesProvider preferences={{ language: 'en' }}>
                <SyncApp />
            </MessagesProvider>
        </PreferencesProvider>,
    );

    await act(() => Promise.resolve());
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'personal' });
    vi.spyOn(bridge.collections, 'tree').mockResolvedValue(
        success([{ kind: 'collection', name: 'Tienda', path: 'tienda', children: [] }]),
    );
    vi.spyOn(bridge.export, 'outline').mockResolvedValue(success({ name: 'Tienda', nodes: [] }));
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the export of Sync (SyncExportAction, from the line SyncExportLine)', () => {
    it('is the line of the menu of a collection: the dialog reads that collection as OpenAPI', async () => {
        await renderApp();

        fireEvent.pointerDown(await screen.findByRole('button', { name: 'Row options' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Export…' }));

        await waitFor(() => {
            expect(bridge.export.outline).toHaveBeenCalledWith({
                workspaceId: 'personal',
                format: 'openapi',
                scope: 'collection',
                collection: 'tienda',
            });
        });
        expect(await screen.findByRole('button', { name: 'Format: OpenAPI' })).toBeVisible();
    });

    it.each([
        ['Postman', 'postman'],
        ['Insomnia', 'insomnia'],
        ['Bruno', 'bruno'],
    ])('reads the collection again as %s when the user picks it', async (label, format) => {
        await renderApp();

        fireEvent.pointerDown(await screen.findByRole('button', { name: 'Row options' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Export…' }));
        fireEvent.pointerDown(await screen.findByRole('button', { name: 'Format: OpenAPI' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: label }));

        await waitFor(() => {
            expect(bridge.export.outline).toHaveBeenLastCalledWith({
                workspaceId: 'personal',
                format,
                scope: 'collection',
                collection: 'tienda',
            });
        });
        expect(await screen.findByRole('button', { name: `Format: ${label}` })).toBeVisible();
    });

    it('is no button of the workspaces page', async () => {
        await renderApp();

        expect(screen.queryByRole('button', { name: 'Export a document' })).toBeNull();
    });
});
