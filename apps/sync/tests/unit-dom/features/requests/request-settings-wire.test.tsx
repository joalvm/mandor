import { MessagesProvider } from '@mandor/i18n';
import { DEFAULT_REQUEST_SETTINGS } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestSettingsForm } from '../../../../src/renderer/features/requests/components/settings/RequestSettingsForm.js';
import { requestDefaultsStore } from '../../../../src/renderer/features/requests/request-defaults-store.js';

// The rows of RequestRedirectSettings, RequestSendingSettings and RequestTlsSettings that change
// what reaches the wire beyond the basics: authorization across hosts, the size, the handshake.

afterEach(() => {
    cleanup();
    requestDefaultsStore.setState({ defaults: DEFAULT_REQUEST_SETTINGS });
});

function draw(): ReturnType<typeof vi.fn> {
    const onSettings = vi.fn();

    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <RequestSettingsForm onSettings={onSettings} settings={{}} />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return onSettings;
}

describe('the settings of a request that shape the wire', () => {
    it('keeps the authorization on another host once asked', () => {
        const onSettings = draw();

        fireEvent.click(
            screen.getByRole('switch', { name: 'Keep the authorization on another host' }),
        );

        expect(onSettings).toHaveBeenLastCalledWith({ followAuthorizationOnRedirect: true });
    });

    it('sets the largest response, in MiB', () => {
        const onSettings = draw();
        const field = screen.getByRole('textbox', { name: 'Largest response' });

        expect(field).toHaveTextContent('50');

        fireEvent.input(field, { target: { textContent: '200' } });

        expect(onSettings).toHaveBeenLastCalledWith({ maxResponseSizeMiB: 200 });
    });

    it('bounds the TLS of the handshake by its versions', async () => {
        const onSettings = draw();

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Oldest TLS version' }), {
            key: 'ArrowDown',
        });
        fireEvent.click(await screen.findByRole('option', { name: 'TLS 1.2' }));

        expect(onSettings).toHaveBeenLastCalledWith({ tlsMinVersion: 'TLSv1.2' });
        expect(screen.getByRole('combobox', { name: 'Newest TLS version' })).toHaveTextContent(
            'Auto',
        );
    });

    it('offers the cipher suites written', () => {
        const onSettings = draw();
        const field = screen.getByRole('textbox', { name: 'Cipher suites' });

        fireEvent.input(field, { target: { textContent: 'TLS_AES_128_GCM_SHA256' } });

        expect(onSettings).toHaveBeenLastCalledWith({ tlsCiphers: 'TLS_AES_128_GCM_SHA256' });
    });

    it('lays the cipher suites under their name, a line longer than the column of a control', () => {
        draw();
        const row = screen
            .getByRole('textbox', { name: 'Cipher suites' })
            .closest('[data-part="setting-row"]');

        expect(row).toHaveAttribute('data-stacked', 'true');
    });
});
