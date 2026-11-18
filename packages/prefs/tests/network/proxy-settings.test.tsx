import { MessagesProvider } from '@mandor/i18n';
import { failure, success, type NetworkState } from '@mandor/ipc';
import { DEFAULT_NETWORK_SETTINGS, type NetworkSettings } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsDialog } from '../../src/components/dialog/SettingsDialog.js';
import { PreferencesProvider } from '../../src/preferences-context.js';
import { openSettings, settingsDialogStore } from '../../src/settings-dialog-store.js';

// The section of the proxy: ProxySettings, its SecretRow, and useNetworkSettings under them.

function stateWith(proxy: Partial<NetworkSettings['proxy']>, proxyPassword = false): NetworkState {
    return {
        settings: {
            ...DEFAULT_NETWORK_SETTINGS,
            proxy: { ...DEFAULT_NETWORK_SETTINGS.proxy, ...proxy },
        },
        kept: { proxyPassword, passphrases: [] },
    };
}

async function openProxy(state: NetworkState): Promise<void> {
    vi.spyOn(bridge.network, 'read').mockResolvedValue(success(state));
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <PreferencesProvider>
                <TooltipProvider>
                    <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                        <SettingsDialog />
                    </ToastProvider>
                </TooltipProvider>
            </PreferencesProvider>
        </MessagesProvider>,
    );
    act(() => {
        openSettings('proxy');
    });
    await screen.findByRole('combobox', { name: 'Proxy' });
}

function type(label: string, value: string): void {
    const field = screen.getByRole('textbox', { name: label });

    field.textContent = value;
    fireEvent.input(field);
}

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    cleanup();
    settingsDialogStore.getState().close();
});

describe('the proxy of the settings', () => {
    it('follows the system by default and says so', async () => {
        await openProxy(stateWith({}));

        expect(screen.getByRole('combobox', { name: 'Proxy' })).toHaveTextContent(
            'System settings',
        );
        expect(screen.queryByRole('textbox', { name: 'Address' })).toBeNull();
    });

    it('writes the mode chosen, whole', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));

        await openProxy(stateWith({}));
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Proxy' }), { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: 'Environment variables' }));

        await waitFor(() => {
            expect(write).toHaveBeenLastCalledWith(stateWith({ mode: 'environment' }).settings);
        });
    });

    /** An address half typed stays in the window; the one that worked stays on disk. */
    it('writes the address once it is whole, and not before', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));

        await openProxy(stateWith({ mode: 'custom' }));
        type('Address', 'http://');
        type('Address', 'socks5://corp.test:1080');

        await waitFor(() => {
            expect(write).toHaveBeenCalledTimes(1);
        });
        expect(write).toHaveBeenLastCalledWith(
            stateWith({ mode: 'custom', url: 'socks5://corp.test:1080' }).settings,
        );
    });

    it('writes the hosts of the bypass the commas leave, and the user', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));

        await openProxy(stateWith({ mode: 'custom', url: 'http://corp.test:1' }));
        type('Bypass', 'a.test, *.local, half typed');
        type('User', 'ana');

        await waitFor(() => {
            expect(write).toHaveBeenLastCalledWith(
                stateWith({
                    mode: 'custom',
                    url: 'http://corp.test:1',
                    bypass: ['a.test', '*.local'],
                    username: 'ana',
                }).settings,
            );
        });
        expect(screen.getByRole('textbox', { name: 'Bypass' })).toHaveTextContent(
            'a.test, *.local, half typed',
        );
    });

    /** The password goes to the keychain and the field empties: it is never shown again. */
    it('keeps the password in the keychain and shows it as kept', async () => {
        const setSecret = vi.spyOn(bridge.network, 'setSecret').mockResolvedValue(success({}));

        await openProxy(stateWith({ mode: 'custom' }));
        type('Password', 's3cret');
        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        await screen.findByRole('button', { name: 'Forget' });
        expect(setSecret).toHaveBeenCalledWith({ target: { kind: 'proxy' }, value: 's3cret' });
        expect(screen.getByRole('textbox', { name: 'Password' })).toHaveTextContent('');
    });

    /** The keychain said no: what was typed stays, and the row says it did not take it. */
    it('keeps what was typed and says so when the keychain refuses the password', async () => {
        const setSecret = vi
            .spyOn(bridge.network, 'setSecret')
            .mockResolvedValue(failure('fs-write', 'keychain locked'));

        await openProxy(stateWith({ mode: 'custom' }));
        type('Password', 's3cret');
        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        await screen.findByText('The keychain did not take it. What you typed is still here.');
        expect(setSecret).toHaveBeenCalledWith({ target: { kind: 'proxy' }, value: 's3cret' });

        const field = screen.getByRole('textbox', { name: 'Password' });

        expect(field).toHaveTextContent('s3cret');
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByRole('button', { name: 'Keep' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Forget' })).toBeNull();

        type('Password', 's3cret2');

        expect(field).toHaveAttribute('aria-invalid', 'false');
    });

    it('forgets a kept password', async () => {
        const setSecret = vi.spyOn(bridge.network, 'setSecret').mockResolvedValue(success({}));

        await openProxy(stateWith({ mode: 'custom' }, true));
        fireEvent.click(screen.getByRole('button', { name: 'Forget' }));

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: 'Forget' })).toBeNull();
        });
        expect(setSecret).toHaveBeenCalledWith({ target: { kind: 'proxy' }, value: '' });
    });
});
