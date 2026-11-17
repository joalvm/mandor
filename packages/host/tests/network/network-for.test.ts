import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFAULT_NETWORK_SETTINGS, type NetworkSettings } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { networkFor, type NetworkDeps } from '../../src/network/network-for.js';
import { writeNetworkSettings } from '../../src/network/network-store.js';

let userData: string;

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-dial-'));
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

type Overrides = Partial<Omit<NetworkDeps, 'userDataDir'>> & { secrets?: Record<string, string> };

function dial(
    overrides: Overrides = {},
): (url: string) => ReturnType<ReturnType<typeof networkFor>> {
    const { secrets = {}, ...deps } = overrides;

    return networkFor({
        userDataDir: userData,
        resolveProxy: () => Promise.resolve('DIRECT'),
        env: {},
        readSecret: (key) => Promise.resolve(secrets[key] ?? null),
        ...deps,
    });
}

async function settle(settings: Partial<NetworkSettings>): Promise<void> {
    await writeNetworkSettings(userData, { ...DEFAULT_NETWORK_SETTINGS, ...settings });
}

function proxyOf(proxy: Partial<NetworkSettings['proxy']>): NetworkSettings['proxy'] {
    return { ...DEFAULT_NETWORK_SETTINGS.proxy, ...proxy };
}

describe('the proxy a url dials through', () => {
    it('asks the system by default, as http for a socket', async () => {
        const asked: string[] = [];
        const resolveProxy = (url: string): Promise<string> => {
            asked.push(url);

            return Promise.resolve('PROXY corp.test:3128');
        };

        await expect(dial({ resolveProxy })('wss://api.test/live')).resolves.toEqual({
            proxy: { url: 'http://corp.test:3128' },
            tls: {},
        });
        expect(asked).toEqual(['https://api.test/live']);
    });

    it('goes direct when the system says DIRECT', async () => {
        await expect(dial()('https://api.test')).resolves.toEqual({ tls: {} });
    });

    it('reads the environment of the process in its mode', async () => {
        await settle({ proxy: proxyOf({ mode: 'environment' }) });

        const network = await dial({ env: { HTTPS_PROXY: 'env.test:8080' } })('https://api.test');

        expect(network.proxy).toEqual({ url: 'http://env.test:8080' });
    });

    it('goes direct in its mode, whatever the system says', async () => {
        await settle({ proxy: proxyOf({ mode: 'none' }) });

        const resolveProxy = (): Promise<string> => Promise.resolve('PROXY corp.test:1');

        await expect(dial({ resolveProxy })('https://api.test')).resolves.toEqual({ tls: {} });
    });

    it('dials the written proxy, with the user and the password of the keychain', async () => {
        await settle({
            proxy: proxyOf({ mode: 'custom', url: 'socks5://corp.test:1080', username: 'ana' }),
        });

        const network = await dial({ secrets: { 'network:proxy': 's3cr t' } })('https://api.test');

        expect(network.proxy).toEqual({ url: 'socks5://ana:s3cr%20t@corp.test:1080' });
    });

    it('dials the written proxy without credentials when no user is named', async () => {
        await settle({ proxy: proxyOf({ mode: 'custom', url: 'http://corp.test:3128' }) });

        const network = await dial({ secrets: { 'network:proxy': 'unused' } })('https://api.test');

        expect(network.proxy).toEqual({ url: 'http://corp.test:3128/' });
    });

    it('goes direct to a host the written bypass names', async () => {
        await settle({
            proxy: proxyOf({ mode: 'custom', url: 'http://corp.test:1', bypass: ['*.local'] }),
        });

        await expect(dial()('https://printer.local')).resolves.toEqual({ tls: {} });
    });

    it('goes direct in custom mode while no proxy is written', async () => {
        await settle({ proxy: proxyOf({ mode: 'custom' }) });

        await expect(dial()('https://api.test')).resolves.toEqual({ tls: {} });
    });
});
