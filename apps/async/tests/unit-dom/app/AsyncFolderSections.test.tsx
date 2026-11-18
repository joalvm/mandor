import { collectionStore } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { bridge, shellStore, tabKind, TabProvider } from '@mandor/shell';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncTabKinds } from '../../../src/renderer/app/AsyncTabKinds.js';
import { AppProviders } from '../support/app-providers.js';

const ALTAS = 'mandor://local/events/folder/pedidos/altas';

let unregister: (() => void) | undefined;

beforeEach(() => {
    collectionStore.setState({
        nodes: [
            {
                kind: 'collection',
                name: 'Pedidos',
                path: 'pedidos',
                children: [{ kind: 'folder', name: 'Altas', path: 'pedidos/altas', children: [] }],
            },
        ],
    });
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success([]));
});

afterEach(() => {
    cleanup();
    unregister?.();
    unregister = undefined;
    shellStore.getState().reset();
    collectionStore.getState().reset();
});

describe('the sections of the tab of a folder in this app (AsyncFolderSections)', () => {
    it('show the docs of the group first', async () => {
        unregister = render(<AsyncTabKinds />, { wrapper: AppProviders }).unmount;
        render(
            <TabProvider value={{ resource: ALTAS, tabId: 'folder-events-pedidos/altas' }}>
                {tabKind('folder')?.body}
            </TabProvider>,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('tab', { name: 'Docs' })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByRole('button', { name: 'Write' })).toBeVisible();
        // FolderVariables follows the docs: the strip lists it second.
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
            'Docs',
            'Variables',
        ]);
    });
});
