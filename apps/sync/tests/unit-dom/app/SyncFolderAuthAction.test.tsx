import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { PreferencesProvider } from '@mandor/prefs';
import type * as Repos from '@mandor/repos';
import { collectionStore } from '@mandor/collections';
import { bridge, selectTabs, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
    vi.restoreAllMocks();
});

describe('the auth of a collection', () => {
    it('is a line of the menu of the collection that opens its tab on the auth', async () => {
        await renderApp();

        fireEvent.pointerDown(await screen.findByRole('button', { name: 'Row options' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Authorization…' }));

        const [opened] = selectTabs(shellStore.getState());

        expect(opened?.resource).toContain('tienda');
        expect(collectionStore.getState().folderSections[opened?.id ?? '']).toBe('auth');
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
