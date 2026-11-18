import { success } from '@mandor/ipc';
import { itemResource } from '@mandor/collections';
import { type AuthChainLevel, parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestAuth } from '../../../../src/renderer/features/requests/components/auth/RequestAuth.js';
import { reloadFolderChains } from '@mandor/env';
import { AppProviders } from '../../support/app-providers.js';
import { folderChainOf } from '../../support/folder-chain.js';

const FOLDER_LEVEL: AuthChainLevel = {
    place: { kind: 'folder', path: 'pedidos' },
    name: 'Pedidos',
    auth: undefined,
};
const WORKSPACE_LEVEL: AuthChainLevel = {
    place: { kind: 'workspace' },
    name: 'Personal',
    auth: { type: 'bearer', token: 't' },
};
const CHAIN = [FOLDER_LEVEL, WORKSPACE_LEVEL];

const REQUEST = parseRequestItem(
    parseCollectionItem({ kind: 'request', name: 'crear pedido', url: '' }),
);

const RESOURCE = itemResource('Local', 'local', 'pedidos/crear-pedido');

function renderRequestAuth(onChange = vi.fn()): void {
    render(
        <RequestAuth
            environment={undefined}
            onChange={onChange}
            onVariablesChange={() => undefined}
            request={REQUEST}
            resource={RESOURCE}
        />,
        { wrapper: AppProviders },
    );
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'local' });
});

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
    vi.restoreAllMocks();
});

describe('the auth of the request on screen', () => {
    it('reads the chain of the item and says which level the request inherits from', async () => {
        const chain = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValue(success(folderChainOf(CHAIN)));

        renderRequestAuth();

        expect(screen.getByRole('combobox', { name: 'Type' })).toBeVisible();

        await waitFor(() => {
            expect(chain).toHaveBeenCalledWith({ workspaceId: 'local', parentPath: 'pedidos' });
        });

        expect(await screen.findByText('Uses Bearer from Personal.')).toBeVisible();
    });

    it('says the request goes out without auth when no level carries one', async () => {
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(
            success(folderChainOf([FOLDER_LEVEL])),
        );

        renderRequestAuth();

        expect(await screen.findByText(/the request goes out without it/u)).toBeVisible();
    });

    it('reads the chain again when a level of it was saved', async () => {
        const chain = vi
            .spyOn(bridge.collections, 'chain')
            .mockResolvedValue(success(folderChainOf(CHAIN)));

        renderRequestAuth();

        await screen.findByText('Uses Bearer from Personal.');

        chain.mockResolvedValue(
            success(
                folderChainOf([
                    { ...FOLDER_LEVEL, auth: { type: 'basic', username: '', password: '' } },
                ]),
            ),
        );

        await act(() => reloadFolderChains('local'));

        expect(await screen.findByText('Uses Basic from Pedidos.')).toBeVisible();
    });

    it('hands the scheme the reader chose over as the auth of the request', async () => {
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(folderChainOf(CHAIN)));
        const onChange = vi.fn();

        renderRequestAuth(onChange);

        await screen.findByText('Uses Bearer from Personal.');

        fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
        fireEvent.click(screen.getByRole('option', { name: 'No auth' }));

        expect(onChange).toHaveBeenCalledWith({ auth: { type: 'none' } });
    });
});
