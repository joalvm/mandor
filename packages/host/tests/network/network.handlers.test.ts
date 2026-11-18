import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, type NetworkFilePurpose } from '@mandor/ipc';
import { DEFAULT_NETWORK_SETTINGS, type NetworkSettings } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerNetworkHandlers } from '../../src/network/network.handlers.js';
import { readSecret } from '../../src/origin/secret-store.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

const keychain = vi.hoisted(() => ({ available: true }));

vi.mock('electron', async () => ({
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => keychain.available,
    }),
}));

let userData: string;
let ipc: IpcSpy;
let chosen: string | null;
let asked: NetworkFilePurpose[];

beforeEach(async () => {
    keychain.available = true;
    userData = await mkdtemp(join(tmpdir(), 'mandor-network-'));
    ipc = spyIpc();
    chosen = '/home/ana/corp.pem';
    asked = [];
    registerNetworkHandlers(ipc, {
        userDataDir: userData,
        chooseFile: (purpose) => {
            asked.push(purpose);

            return Promise.resolve(chosen);
        },
    });
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

const WITH_CERTIFICATES: NetworkSettings = {
    ...DEFAULT_NETWORK_SETTINGS,
    clientCertificates: [
        { id: 'one', host: 'a.test', certPath: '', keyPath: '', pfxPath: 'a.p12' },
        { id: 'two', host: 'b.test', certPath: '', keyPath: '', pfxPath: 'b.p12' },
    ],
};

describe('the channels of the network settings', () => {
    it('reads the defaults, with nothing kept, before anything was written', async () => {
        await expect(ipc.call(CHANNELS.networkRead)).resolves.toEqual({
            ok: true,
            value: {
                settings: DEFAULT_NETWORK_SETTINGS,
                kept: { proxyPassword: false, passphrases: [] },
            },
        });
    });

    it('writes the settings whole and reads them back', async () => {
        await expect(ipc.call(CHANNELS.networkWrite, WITH_CERTIFICATES)).resolves.toEqual({
            ok: true,
            value: {},
        });

        const read = (await ipc.call(CHANNELS.networkRead)) as { value: { settings: unknown } };

        expect(read.value.settings).toEqual(WITH_CERTIFICATES);
    });

    it('refuses settings that do not hold their shape', async () => {
        const answer = await ipc.call(CHANNELS.networkWrite, { proxy: { mode: 'pigeon' } });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    /** The password travels to the keychain and back as a yes, never as the value. */
    it('keeps a secret in the keychain and says only that it is kept', async () => {
        await ipc.call(CHANNELS.networkWrite, WITH_CERTIFICATES);
        await ipc.call(CHANNELS.networkSecret, { target: { kind: 'proxy' }, value: 'pw' });
        await ipc.call(CHANNELS.networkSecret, {
            target: { kind: 'certificate', id: 'two' },
            value: 'phrase-77',
        });

        await expect(ipc.call(CHANNELS.networkRead)).resolves.toMatchObject({
            value: { kept: { proxyPassword: true, passphrases: ['two'] } },
        });
        await expect(readSecret(userData, 'network:proxy')).resolves.toBe('pw');
        await expect(readFile(join(userData, 'network.json'), 'utf8')).resolves.not.toContain(
            'phrase-77',
        );
    });

    it('forgets a secret when it is set empty', async () => {
        await ipc.call(CHANNELS.networkSecret, { target: { kind: 'proxy' }, value: 'pw' });
        await ipc.call(CHANNELS.networkSecret, { target: { kind: 'proxy' }, value: '' });

        await expect(readSecret(userData, 'network:proxy')).resolves.toBeNull();
    });

    it('forgets the passphrase of a certificate taken off the list', async () => {
        await ipc.call(CHANNELS.networkWrite, WITH_CERTIFICATES);
        await ipc.call(CHANNELS.networkSecret, {
            target: { kind: 'certificate', id: 'one' },
            value: 'pass',
        });
        await ipc.call(CHANNELS.networkWrite, {
            ...WITH_CERTIFICATES,
            clientCertificates: WITH_CERTIFICATES.clientCertificates.slice(1),
        });

        await expect(readSecret(userData, 'network:certificate:one')).resolves.toBeNull();
    });

    /**
     * The list is saved on every change, without waiting for the save before. A certificate
     * added and taken off at once must not keep its passphrase: the second save has to see the
     * list the first one left.
     */
    it('forgets the passphrase of a certificate taken off while it was still being added', async () => {
        await ipc.call(CHANNELS.networkSecret, {
            target: { kind: 'certificate', id: 'one' },
            value: 'pass',
        });
        await Promise.all([
            ipc.call(CHANNELS.networkWrite, WITH_CERTIFICATES),
            ipc.call(CHANNELS.networkWrite, DEFAULT_NETWORK_SETTINGS),
        ]);

        await expect(readSecret(userData, 'network:certificate:one')).resolves.toBeNull();
        await expect(ipc.call(CHANNELS.networkRead)).resolves.toMatchObject({
            value: { settings: DEFAULT_NETWORK_SETTINGS },
        });
    });

    it('reads nothing as kept on a machine without a keychain', async () => {
        await ipc.call(CHANNELS.networkSecret, { target: { kind: 'proxy' }, value: 'pw' });
        keychain.available = false;

        await expect(ipc.call(CHANNELS.networkRead)).resolves.toMatchObject({
            value: { kept: { proxyPassword: false } },
        });
    });

    it('gives back the file the user picked for a purpose, or null', async () => {
        await expect(ipc.call(CHANNELS.networkChooseFile, { purpose: 'ca' })).resolves.toEqual({
            ok: true,
            value: '/home/ana/corp.pem',
        });

        chosen = null;

        await expect(ipc.call(CHANNELS.networkChooseFile, { purpose: 'pfx' })).resolves.toEqual({
            ok: true,
            value: null,
        });
        expect(asked).toEqual(['ca', 'pfx']);
    });

    it('takes every channel away when disposed', () => {
        const other = spyIpc();
        const dispose = registerNetworkHandlers(other, {
            userDataDir: userData,
            chooseFile: () => Promise.resolve(null),
        });

        dispose();

        expect(other.registered()).toEqual([]);
    });
});
