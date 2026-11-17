import { ItemProvider, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestPanel } from '../../../../src/renderer/features/requests/components/panel/RequestPanel.js';
import { requestsStore } from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

describe('the jar of cookies inside a request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        requestsStore.getState().reset();
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(
            success({ kind: 'request', method: 'GET', name: 'crear pedido', url: '/pedidos' }),
        );
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it('stands in the strip of the sections of the request, at its end', async () => {
        render(
            <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
                <RequestPanel />
            </ItemProvider>,
            { wrapper: AppProviders },
        );

        const button = await screen.findByRole('button', { name: 'Cookies' });

        expect(button.closest('[data-part="tabs-strip"]')).not.toBeNull();
    });
});
