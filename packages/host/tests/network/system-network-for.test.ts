import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFAULT_NETWORK_SETTINGS } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writeNetworkSettings } from '../../src/network/network-store.js';
import { systemNetworkFor } from '../../src/network/system-network-for.js';
import { storeSecret } from '../../src/origin/secret-store.js';

// Neither the session of Electron nor the keychain exist in a test run; the doubles keep their
// contracts: a PAC answer for a url, and a keychain that can say no.
const machine = vi.hoisted(() => ({ keychain: true, asked: [] as string[] }));

vi.mock('electron', async () => ({
    session: {
        defaultSession: {
            resolveProxy: (url: string) => {
                machine.asked.push(url);

                return Promise.resolve('PROXY corp.test:3128');
            },
        },
    },
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => machine.keychain,
    }),
}));

let userData: string;

beforeEach(async () => {
    machine.keychain = true;
    machine.asked = [];
    userData = await mkdtemp(join(tmpdir(), 'mandor-system-network-'));
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

const CUSTOM = {
    ...DEFAULT_NETWORK_SETTINGS,
    proxy: { mode: 'custom' as const, url: 'http://corp.test:1', bypass: [], username: 'ana' },
};

describe('the network of this machine', () => {
    it('asks the session of Electron for the proxy of a url', async () => {
        await expect(systemNetworkFor(userData)('https://api.test/x')).resolves.toEqual({
            proxy: { url: 'http://corp.test:3128' },
            tls: {},
        });
        expect(machine.asked).toEqual(['https://api.test/x']);
    });

    it('unseals the password of the proxy from the keychain', async () => {
        await writeNetworkSettings(userData, CUSTOM);
        await storeSecret(userData, 'network:proxy', 'pw');

        const network = await systemNetworkFor(userData)('https://api.test');

        expect(network.proxy).toEqual({ url: 'http://ana:pw@corp.test:1/' });
    });

    /** No keychain kept nothing: the dial goes on without the password instead of failing. */
    it('dials without a password on a machine without a keychain', async () => {
        await writeNetworkSettings(userData, CUSTOM);
        machine.keychain = false;

        const network = await systemNetworkFor(userData)('https://api.test');

        expect(network.proxy).toEqual({ url: 'http://ana@corp.test:1/' });
    });
});
