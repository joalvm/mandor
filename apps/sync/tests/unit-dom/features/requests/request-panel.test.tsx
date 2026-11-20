import { ItemProvider, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { byPart } from '@mandor/ui/testing';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestPanel } from '../../../../src/renderer/features/requests/components/panel/RequestPanel.js';
import { requestsStore } from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const BODY = {
    kind: 'request',
    method: 'POST',
    name: 'crear pedido',
    query: [{ key: 'dryRun', value: 'true', enabled: false }],
    url: '{{baseUrl}}/pedidos',
};

function fillStores(): void {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    envStore.getState().reset();
}

describe('the panel of a request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        fillStores();
        requestsStore.getState().reset();
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(BODY));
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it('opens on the query, with every half of the request one tab away', async () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                <RequestPanel />
            </ItemProvider>,
            { wrapper: AppProviders },
        );

        expect(await screen.findByRole('tab', { name: 'Params', selected: true })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Headers' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Body' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Settings' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Doc' })).toBeVisible();

        expect(
            await screen.findByRole('checkbox', { name: 'Send this entry' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Send this entry' })).not.toBeChecked();
    });

    /**
     * The destination rests on a card of its own above the pair, and what is asked and what comes
     * back each rest on theirs: three cards, each a zone a screen reader can land on.
     */
    it('draws the destination, the request and its response on three named cards', async () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                <RequestPanel />
            </ItemProvider>,
            { wrapper: AppProviders },
        );

        const target = await screen.findByRole('region', { name: 'Target' });
        const request = screen.getByRole('region', { name: 'Request' });
        const response = screen.getByRole('region', { name: 'Response' });

        expect(target).toContainElement(screen.getByRole('textbox', { name: 'URL' }));
        expect(target).toHaveAttribute('data-size', 'content');
        expect(request).toContainElement(screen.getByRole('tab', { name: 'Params' }));
        expect(response).not.toContainElement(screen.getByRole('tab', { name: 'Params' }));
        expect(byPart('request-panel')).toHaveClass('gap-gap-gutter');
    });

    it('a name nothing declares leaves the destination as it is and the send open', async () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                <RequestPanel />
            </ItemProvider>,
            { wrapper: AppProviders },
        );

        const url = await screen.findByRole('textbox', { name: 'URL' });

        expect(url).not.toBeInvalid();
        expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    });

    it('the environment of the workspace stands behind the variables of the request', async () => {
        const local = {
            id: 'env-1',
            name: 'Local',
            variables: [
                { enabled: true, name: 'baseUrl', secret: false, value: 'http://localhost' },
            ],
        };

        envStore.setState({ activeEnvironmentIds: { local: 'env-1' }, environments: [local] });

        render(
            <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                <RequestPanel />
            </ItemProvider>,
            { wrapper: AppProviders },
        );

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: 'URL' })).toBeValid();
        });
    });
});
