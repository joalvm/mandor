import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, TabProvider } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { useFolderDescription } from '../src/hooks/useFolderDescription.js';
import { folderKey, loadFolderDescription } from '../src/lib/folder-description.js';
import {
    flushFolderDescriptionWrite,
    scheduleFolderDescriptionWrite,
} from '../src/lib/pending-folder-description-write.js';
import { FolderDocs } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

const ALTAS = 'mandor://local/events/folder/pedidos/altas';

function levelSaying(description?: string) {
    return [
        {
            level: 'folder' as const,
            place: { kind: 'folder' as const, path: 'pedidos/altas' },
            name: 'Altas',
            settings: description === undefined ? {} : { description },
        },
    ];
}

beforeEach(() => {
    docsStore.getState().reset();
});

afterEach(async () => {
    cleanup();
    await flushFolderDescriptionWrite('events', 'pedidos/altas');
    docsStore.getState().reset();
});

function showDocs(): void {
    render(
        <TabProvider value={{ resource: ALTAS, tabId: 'folder-events-pedidos/altas' }}>
            <FolderDocs />
        </TabProvider>,
        { wrapper: AppProviders },
    );
}

describe('the docs of a folder', () => {
    it('show the words of the group, read from its own file', async () => {
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(
            success(levelSaying('# Altas\n\nLas altas del día.\n')),
        );

        showDocs();

        expect(await screen.findByRole('heading', { level: 1, name: 'Altas' })).toBeVisible();
    });

    it('are written as they are typed, through the patch of the folder', async () => {
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(levelSaying()));

        const write = vi.spyOn(bridge.collections, 'writeSettings');

        showDocs();
        fireEvent.click(await screen.findByRole('button', { name: 'Write' }));
        (await editorAt(0)).typeOver('Nuevas');
        await act(() => flushFolderDescriptionWrite('events', 'pedidos/altas'));

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'events',
            path: 'pedidos/altas',
            patch: { description: 'Nuevas' },
        });
    });
});

describe('the words of a folder in the store', () => {
    it('are read once at a time and kept, and refused reads keep what was there', async () => {
        const chain = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValueOnce(success(levelSaying('uno')))
            .mockResolvedValueOnce({ ok: false, error: { code: 'fs-read', message: 'no' } });

        await Promise.all([
            loadFolderDescription('events', 'pedidos/altas'),
            loadFolderDescription('events', 'pedidos/altas'),
        ]);
        await loadFolderDescription('events', 'pedidos/altas');

        expect(chain).toHaveBeenCalledTimes(2);
        expect(docsStore.getState().folderDescriptions[folderKey('events', 'pedidos/altas')]).toBe(
            'uno',
        );
    });

    it('are read again when the tree changes on disk, after what was typed is written', async () => {
        const chain = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValueOnce(success(levelSaying('uno')))
            .mockResolvedValueOnce(success(levelSaying('dos')));
        const write = vi.spyOn(bridge.collections, 'writeSettings');

        function Reader() {
            return <p>{useFolderDescription('events', 'pedidos/altas')}</p>;
        }

        render(<Reader />, { wrapper: AppProviders });
        expect(await screen.findByText('uno')).toBeVisible();

        act(() => {
            scheduleFolderDescriptionWrite('events', 'pedidos/altas', 'tecleado');
            (bridge as FakeBridge).emitRepoChanged({
                changes: [{ area: 'collections', workspaceId: 'events', path: 'pedidos/altas' }],
            });
        });

        expect(await screen.findByText('dos')).toBeVisible();
        expect(write).toHaveBeenCalledTimes(1);
        expect(chain).toHaveBeenCalledTimes(2);
    });
});
