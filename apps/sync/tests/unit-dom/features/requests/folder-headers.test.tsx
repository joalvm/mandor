import { envStore } from '@mandor/env';
import { failure, success } from '@mandor/ipc';
import type { FolderChainLevel, RequestLine } from '@mandor/schema';
import { bridge, settlePendingWrites, shellStore, TabProvider } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FolderHeaders } from '../../../../src/renderer/features/requests/components/folder/FolderHeaders.js';
import { AppProviders } from '../../support/app-providers.js';

const TAB = { resource: 'mandor://local/local/folder/pedidos/altas', tabId: 'folder-1' };
const TENANT: RequestLine = { enabled: true, key: 'X-Tenant', value: 'acme' };

function chainOf(headers: RequestLine[] = []): FolderChainLevel[] {
    return [
        {
            level: 'folder',
            place: { kind: 'folder', path: 'pedidos/altas' },
            name: 'Altas',
            settings: { headers },
        },
        { level: 'workspace', place: { kind: 'workspace' }, name: 'Personal', settings: {} },
    ];
}

async function show(chain: FolderChainLevel[]): Promise<void> {
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chain));
    render(
        <TabProvider value={TAB}>
            <FolderHeaders />
        </TabProvider>,
        { wrapper: AppProviders },
    );
    await screen.findAllByRole('textbox', { name: 'Key' });
}

function cell(name: 'Key' | 'Value', row: number): HTMLElement {
    const found = screen.getAllByRole('textbox', { name })[row];

    if (found === undefined) {
        throw new Error(`there is no ${name} cell in row ${String(row)}`);
    }

    return found;
}

function typeIn(target: HTMLElement, text: string): void {
    fireEvent.focus(target);
    target.textContent = text;
    fireEvent.input(target);
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    envStore.setState({ folderChains: {} });
});

afterEach(async () => {
    await settlePendingWrites();
    cleanup();
    shellStore.getState().reset();
    vi.restoreAllMocks();
});

describe('the headers of a collection or a folder, in its tab', () => {
    it('shows the lines the first level of the chain declares', async () => {
        await show(chainOf([TENANT]));

        expect(cell('Key', 0)).toHaveTextContent('X-Tenant');
        expect(cell('Value', 0)).toHaveTextContent('acme');
    });

    it('writes a new line through the patch of the settings, after the pause', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        await show(chainOf());
        typeIn(cell('Key', 0), 'X-Tenant');

        expect(write).not.toHaveBeenCalled();

        await act(() => settlePendingWrites());

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'local',
            path: 'pedidos/altas',
            patch: { headers: [{ enabled: true, key: 'X-Tenant', value: '' }] },
        });
    });

    it('keeps a line without a name on screen while the file does not get it', async () => {
        const write = vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(success({}));

        await show(chainOf());
        typeIn(cell('Value', 0), 'acme');
        await act(() => settlePendingWrites());

        expect(write.mock.calls[0]?.[0].patch).toEqual({ headers: [] });
        expect(cell('Value', 0)).toHaveTextContent('acme');
    });

    it('raises a toast when the write is refused, and shows what the disk holds', async () => {
        vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(
            failure('not-found', 'the folder is gone'),
        );
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chainOf([TENANT])));

        const onNotify = vi.fn();

        render(
            <AppProviders onNotify={onNotify}>
                <TabProvider value={TAB}>
                    <FolderHeaders />
                </TabProvider>
            </AppProviders>,
        );
        await screen.findAllByRole('textbox', { name: 'Key' });

        // Without the caret in it: a cell that holds the caret keeps what is being typed.
        const key = cell('Key', 0);

        key.textContent = 'X-Otra';
        fireEvent.input(key);
        await act(() => settlePendingWrites());

        expect(onNotify).toHaveBeenCalledOnce();
        expect(cell('Key', 0)).toHaveTextContent('X-Tenant');
    });

    it('draws nothing for a tab that looks at no folder', () => {
        render(
            <TabProvider value={{ resource: 'mandor://local/settings', tabId: 'settings' }}>
                <FolderHeaders />
            </TabProvider>,
            { wrapper: AppProviders },
        );

        expect(screen.queryByRole('textbox', { name: 'Key' })).toBeNull();
    });
});
