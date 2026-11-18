import { MessagesProvider } from '@mandor/i18n';
import { SettingsDialog } from '@mandor/prefs';
import { DEFAULT_REQUEST_SETTINGS, type RequestSettingsOverrides } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestSettingsForm } from '../../../../src/renderer/features/requests/components/settings/RequestSettingsForm.js';
import { RequestDefaultsSettings } from '../../../../src/renderer/features/requests/RequestDefaultsSettings.js';
import { requestDefaultsStore } from '../../../../src/renderer/features/requests/request-defaults-store.js';

afterEach(() => {
    cleanup();
    requestDefaultsStore.setState({ defaults: DEFAULT_REQUEST_SETTINGS });
});

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

type HarnessProps = { initial?: RequestSettingsOverrides };

function Harness({ initial = {} }: HarnessProps): React.ReactElement {
    const [settings, setSettings] = useState(initial);

    return <RequestSettingsForm onSettings={setSettings} settings={settings} />;
}

describe('the settings of a request', () => {
    it('shows what the send would use, and keeps only what the request changed', () => {
        const onSettings = vi.fn();

        draw(<RequestSettingsForm onSettings={onSettings} settings={{}} />);

        const field = screen.getByRole('textbox', { name: 'Timeout' });

        expect(field).toHaveTextContent('30000');

        fireEvent.input(field, { target: { textContent: '1500' } });

        expect(onSettings).toHaveBeenCalledWith({ timeoutMs: 1500 });

        fireEvent.input(field, { target: { textContent: 'soon' } });

        expect(onSettings).toHaveBeenCalledTimes(1);
        expect(field).toBeInvalid();
    });

    it('follows the defaults of the app on every row it leaves alone', () => {
        requestDefaultsStore.setState({
            defaults: { ...DEFAULT_REQUEST_SETTINGS, timeoutMs: 9000 },
        });
        draw(<Harness />);

        expect(screen.getByRole('textbox', { name: 'Timeout' })).toHaveTextContent('9000');
        expect(screen.getAllByText('Default from')).toHaveLength(12);
        expect(screen.queryByRole('button', { name: 'Use the default' })).toBeNull();
    });

    it('hands a value of its own back to the defaults from the same line', () => {
        draw(<Harness initial={{ timeoutMs: 1500, useCookieJar: false }} />);

        expect(screen.getAllByRole('button', { name: 'Use the default' })).toHaveLength(2);

        fireEvent.click(screen.getAllByRole('button', { name: 'Use the default' })[0] as Element);

        expect(screen.getByRole('textbox', { name: 'Timeout' })).toHaveTextContent('30000');
        expect(screen.getAllByRole('button', { name: 'Use the default' })).toHaveLength(1);
    });

    it('leads from a row that follows the defaults to where they are set', () => {
        draw(
            <>
                <RequestDefaultsSettings />
                <Harness />
                <SettingsDialog />
            </>,
        );
        fireEvent.click(screen.getAllByRole('button', { name: 'Settings' })[0] as Element);

        expect(screen.getByRole('dialog', { name: 'Requests' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    });

    it('the ceiling of redirects may be zero: no redirect is a setting, not a mistake', () => {
        const onSettings = vi.fn();

        draw(<RequestSettingsForm onSettings={onSettings} settings={{}} />);

        fireEvent.input(screen.getByRole('textbox', { name: 'Redirect ceiling' }), {
            target: { textContent: '0' },
        });

        expect(onSettings).toHaveBeenCalledWith({ maxRedirects: 0 });
    });

    it('what hangs from following redirects goes away while they are not followed', () => {
        draw(<Harness />);

        const keepMethod = { name: 'Keep the method on a redirect' };

        expect(screen.getByRole('textbox', { name: 'Redirect ceiling' })).toBeVisible();
        expect(screen.getByRole('switch', keepMethod)).toBeVisible();

        fireEvent.click(screen.getByRole('switch', { name: 'Follow redirects' }));

        expect(screen.queryByRole('textbox', { name: 'Redirect ceiling' })).toBeNull();
        expect(screen.queryByRole('switch', keepMethod)).toBeNull();
    });

    it('holds a send to one HTTP version, or lets the connection choose', async () => {
        const onSettings = vi.fn();

        draw(<RequestSettingsForm onSettings={onSettings} settings={{}} />);

        const choice = screen.getByRole('combobox', { name: 'HTTP version' });

        expect(choice).toHaveTextContent('Auto');

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: 'HTTP/2' }));

        expect(onSettings).toHaveBeenCalledWith({ httpVersion: 'http2' });
    });

    it('leaves the jar of the environment out of a send that asks to', () => {
        const onSettings = vi.fn();

        draw(<RequestSettingsForm onSettings={onSettings} settings={{}} />);
        fireEvent.click(screen.getByRole('switch', { name: 'Use the cookie jar' }));

        expect(onSettings).toHaveBeenCalledWith({ useCookieJar: false });
    });

    it('turning the TLS check off says so in place, not in a toast', () => {
        draw(<Harness />);

        expect(screen.queryByText(/trusts any certificate/)).toBeNull();

        fireEvent.click(screen.getByRole('switch', { name: 'Verify the TLS certificate' }));

        expect(screen.getByText(/trusts any certificate/)).toBeVisible();
    });
});
