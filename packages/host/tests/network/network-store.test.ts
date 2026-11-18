import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFAULT_NETWORK_SETTINGS, type NetworkSettings } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    passphraseKey,
    PROXY_PASSWORD_KEY,
    readNetworkSettings,
    writeNetworkSettings,
} from '../../src/network/network-store.js';

let userData: string;

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-network-'));
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

const WRITTEN: NetworkSettings = {
    proxy: { mode: 'custom', url: 'http://corp.test:3128', bypass: ['*.local'], username: 'ana' },
    caPaths: ['ca.pem'],
    clientCertificates: [
        { id: 'one', host: 'api.test', certPath: 'c.pem', keyPath: 'k.pem', pfxPath: '' },
    ],
};

describe('the network settings of this machine', () => {
    it('reads the defaults before anything was written', async () => {
        await expect(readNetworkSettings(userData)).resolves.toEqual(DEFAULT_NETWORK_SETTINGS);
    });

    it('reads back what was written', async () => {
        await writeNetworkSettings(userData, WRITTEN);

        await expect(readNetworkSettings(userData)).resolves.toEqual(WRITTEN);
    });

    it('keeps the settings beside the app, in network.json', async () => {
        await writeNetworkSettings(userData, WRITTEN);

        const source = await readFile(join(userData, 'network.json'), 'utf8');

        expect(JSON.parse(source)).toEqual(WRITTEN);
    });

    it.each(['{ broken', '{"proxy": {"mode": "carrier-pigeon"}}'])(
        'reads the defaults from a file that does not hold settings: %s',
        async (source) => {
            await writeFile(join(userData, 'network.json'), source);

            await expect(readNetworkSettings(userData)).resolves.toEqual(DEFAULT_NETWORK_SETTINGS);
        },
    );

    /** The defaults would send every request around the proxy the person set up. */
    it('fails on a file that is there but cannot be read', async () => {
        await mkdir(join(userData, 'network.json'));

        await expect(readNetworkSettings(userData)).rejects.toThrow();
    });

    it('keeps each secret under its own key of the keychain', () => {
        expect(PROXY_PASSWORD_KEY).toBe('network:proxy');
        expect(passphraseKey('one')).toBe('network:certificate:one');
    });
});
