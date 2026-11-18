import { ItemProvider, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { failure, success } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { RequestPanel } from '../../../../src/renderer/features/requests/components/panel/RequestPanel.js';
import { requestsStore } from '../../../../src/renderer/features/requests/index.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const BODY = { kind: 'request', method: 'GET', name: 'crear pedido', url: '{{baseUrl}}/pedidos' };

const ENVIRONMENT = {
    id: 'env-1',
    name: 'Local',
    variables: [{ enabled: true, name: 'baseUrl', secret: false, value: 'http://localhost' }],
};

const RESPONSE = {
    status: 201,
    statusText: 'Created',
    httpVersion: '2' as const,
    headers: [],
    body: null,
    sizes: { transferredBytes: 10, bodyBytes: 3100, decoded: true },
    timings: { dnsMs: 1, connectMs: 1, tlsMs: 1, firstByteMs: 1, totalMs: 142, viaProxy: false },
    redirects: [],
    cookies: [],
};

function draw(): void {
    render(
        <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
            <RequestPanel />
        </ItemProvider>,
        { wrapper: AppProviders },
    );
}

describe('sending from the panel of a request', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        shellStore.getState().reset();
        shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
        shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
        envStore.setState({
            activeEnvironmentIds: { local: 'env-1' },
            environments: [ENVIRONMENT],
        });
        requestsStore.getState().reset();
        vi.spyOn(window.mandor.collections, 'readItem').mockResolvedValue(success(BODY));
    });

    afterEach(() => {
        cleanup();
        envStore.getState().reset();
        requestsStore.getState().reset();
        shellStore.getState().reset();
    });

    it('shows the status, the time and the size of the response that came back', async () => {
        vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));
        draw();

        fireEvent.click(await screen.findByRole('button', { name: 'Send' }));

        expect(await screen.findByText('201')).toBeVisible();
        expect(screen.getByText('142 ms')).toBeVisible();
        expect(screen.getByText('10 B')).toBeVisible();
    });

    it('sends with Ctrl+Enter from the field of the url', async () => {
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        draw();

        await screen.findByRole('button', { name: 'Send' });
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), {
            ctrlKey: true,
            key: 'Enter',
        });

        await waitFor(() => {
            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    it('sends with Ctrl+Enter from anywhere else in the panel', async () => {
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        draw();

        fireEvent.keyDown(await screen.findByRole('tab', { name: 'Headers' }), {
            ctrlKey: true,
            key: 'Enter',
        });

        await waitFor(() => {
            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    it('sends nothing more while a send is in flight', async () => {
        const send = vi
            .spyOn(syncBridge.request, 'send')
            .mockReturnValue(new Promise(() => undefined));

        draw();

        fireEvent.click(await screen.findByRole('button', { name: 'Send' }));
        await waitFor(() => {
            expect(send).toHaveBeenCalledTimes(1);
        });
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), {
            ctrlKey: true,
            key: 'Enter',
        });

        expect(send).toHaveBeenCalledTimes(1);
    });

    it('does not send with a plain Enter', async () => {
        const send = vi.spyOn(syncBridge.request, 'send');

        draw();

        await screen.findByRole('button', { name: 'Send' });
        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'Enter' });

        expect(send).not.toHaveBeenCalled();
    });

    it('aborts the send in flight under its own id, and says it was cancelled', async () => {
        const cancel = vi.spyOn(syncBridge.request, 'cancel');
        const send = vi.spyOn(syncBridge.request, 'send').mockImplementation(
            () =>
                new Promise((resolve) => {
                    cancel.mockImplementation(() => {
                        resolve(failure('request-aborted', 'cut'));

                        return Promise.resolve(success({}));
                    });
                }),
        );

        draw();

        fireEvent.click(await screen.findByRole('button', { name: 'Send' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Abort' }));

        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent(
                'The request was cancelled before it finished.',
            );
        });
        expect(cancel).toHaveBeenCalledWith({ sendId: send.mock.calls[0]?.[0].sendId });
        expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    });

    it('sends a name nobody defined as it was written, button or keyboard', async () => {
        envStore.setState({ activeEnvironmentIds: {}, environments: [] });
        const send = vi.spyOn(syncBridge.request, 'send').mockResolvedValue(success(RESPONSE));

        draw();

        const button = await screen.findByRole('button', { name: 'Send' });

        expect(button).toBeEnabled();

        fireEvent.click(button);

        await waitFor(() => {
            expect(send).toHaveBeenCalledTimes(1);
        });

        expect(send.mock.calls[0]?.[0].request.url).toBe('{{baseUrl}}/pedidos');

        fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), {
            key: 'Enter',
            metaKey: true,
        });

        await waitFor(() => {
            expect(send).toHaveBeenCalledTimes(2);
        });
    });

    it('draws the response to the right of the request, behind a divider', async () => {
        draw();

        await screen.findByRole('button', { name: 'Send' });

        expect(
            screen.getByRole('separator', { name: 'Resize the request and its response' }),
        ).toBeVisible();
        expect(screen.getByText('Send the request to see its response here.')).toBeVisible();
    });
});
