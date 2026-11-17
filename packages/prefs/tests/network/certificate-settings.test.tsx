import { MessagesProvider } from '@mandor/i18n';
import { success, type NetworkFilePurpose, type NetworkState } from '@mandor/ipc';
import { DEFAULT_NETWORK_SETTINGS, type NetworkSettings } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsDialog } from '../../src/components/dialog/SettingsDialog.js';
import { PreferencesProvider } from '../../src/preferences-context.js';
import { openSettings, settingsDialogStore } from '../../src/settings-dialog-store.js';

// The section of the certificates: CertificateSettings, CertificateAuthorities, the
// ClientCertificateEntry of each host and the FileRow of each of its files.

const PICKED: Record<NetworkFilePurpose, string> = {
    ca: '/home/ana/corp-root.pem',
    cert: '/home/ana/client.crt',
    key: '/home/ana/client.key',
    pfx: 'C:\\Users\\ana\\client.p12',
};

function stateWith(settings: Partial<NetworkSettings>, passphrases: string[] = []): NetworkState {
    return {
        settings: { ...DEFAULT_NETWORK_SETTINGS, ...settings },
        kept: { proxyPassword: false, passphrases },
    };
}

async function openCertificates(state: NetworkState): Promise<void> {
    vi.spyOn(bridge.network, 'read').mockResolvedValue(success(state));
    vi.spyOn(bridge.network, 'chooseFile').mockImplementation((purpose) =>
        Promise.resolve(success(PICKED[purpose])),
    );
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
        openSettings('certificates');
    });
    await screen.findByRole('button', { name: 'Add authority' });
}

function lastWritten(write: {
    mock: { lastCall?: [NetworkSettings] | undefined };
}): NetworkSettings {
    const settings = write.mock.lastCall?.[0];

    if (settings === undefined) {
        throw new Error('nothing was written');
    }

    return settings;
}

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    cleanup();
    settingsDialogStore.getState().close();
});

describe('the certificates of the settings', () => {
    it('adds an authority from the dialog of the system and shows its name alone', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));

        await openCertificates(stateWith({}));
        fireEvent.click(screen.getByRole('button', { name: 'Add authority' }));

        await screen.findByText('corp-root.pem');
        expect(lastWritten(write).caPaths).toEqual(['/home/ana/corp-root.pem']);
    });

    it('removes an authority', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));

        await openCertificates(stateWith({ caPaths: ['/etc/a.pem', '/etc/b.pem'] }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove a.pem' }));

        await waitFor(() => {
            expect(lastWritten(write).caPaths).toEqual(['/etc/b.pem']);
        });
    });

    /** A certificate with no host yet waits in the window: it would match nothing. */
    it('writes a client certificate once it names its host, with the files picked', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));

        await openCertificates(stateWith({}));
        fireEvent.click(screen.getByRole('button', { name: 'Add certificate' }));
        await screen.findByRole('heading', { name: 'New certificate' });

        expect(write).not.toHaveBeenCalled();

        const host = screen.getByRole('textbox', { name: 'Host' });

        host.textContent = 'api.test';
        fireEvent.input(host);
        fireEvent.click(screen.getAllByRole('button', { name: 'Choose file' })[2] ?? document.body);

        await screen.findByRole('button', { name: 'client.p12' });
        expect(lastWritten(write).clientCertificates).toEqual([
            expect.objectContaining({ host: 'api.test', pfxPath: PICKED.pfx, certPath: '' }),
        ]);
    });

    it('keeps the passphrase of a certificate under its id, and removes the certificate', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));
        const setSecret = vi.spyOn(bridge.network, 'setSecret').mockResolvedValue(success({}));
        const certificate = {
            id: 'one',
            host: 'api.test',
            certPath: '',
            keyPath: '',
            pfxPath: 'x.p12',
        };

        await openCertificates(stateWith({ clientCertificates: [certificate] }));

        const phrase = screen.getByRole('textbox', { name: 'Passphrase' });

        phrase.textContent = 'open sesame';
        fireEvent.input(phrase);
        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        await screen.findByRole('button', { name: 'Forget' });
        expect(setSecret).toHaveBeenCalledWith({
            target: { kind: 'certificate', id: 'one' },
            value: 'open sesame',
        });

        fireEvent.click(screen.getByRole('button', { name: 'Remove certificate' }));
        fireEvent.click(
            within(await screen.findByRole('alertdialog')).getByRole('button', {
                name: 'Remove certificate',
            }),
        );

        await waitFor(() => {
            expect(lastWritten(write).clientCertificates).toEqual([]);
        });
    });

    /** The passphrase leaves the keychain with the certificate: it asks, and a no leaves both. */
    it('asks before removing a certificate, and keeps it when the answer is no', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));
        const certificate = {
            id: 'one',
            host: 'api.test',
            certPath: '',
            keyPath: '',
            pfxPath: 'x.p12',
        };

        await openCertificates(stateWith({ clientCertificates: [certificate] }, ['one']));
        fireEvent.click(screen.getByRole('button', { name: 'Remove certificate' }));

        const dialog = await screen.findByRole('alertdialog', { name: 'Remove this certificate?' });

        expect(dialog).toHaveTextContent('api.test and its passphrase leave this machine.');
        expect(write).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        await waitFor(() => {
            expect(screen.queryByRole('alertdialog')).toBeNull();
        });
        expect(write).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'api.test' })).toBeVisible();
    });

    it('clears one file of a certificate', async () => {
        const write = vi.spyOn(bridge.network, 'write').mockResolvedValue(success({}));
        const certificate = {
            id: 'one',
            host: 'api.test',
            certPath: '/c.pem',
            keyPath: '/k.pem',
            pfxPath: '',
        };

        await openCertificates(stateWith({ clientCertificates: [certificate] }));
        fireEvent.click(screen.getByRole('button', { name: 'Clear k.pem' }));

        await waitFor(() => {
            expect(lastWritten(write).clientCertificates[0]?.keyPath).toBe('');
        });
    });
});
