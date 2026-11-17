import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rootCertificates } from 'node:tls';

import {
    DEFAULT_NETWORK_SETTINGS,
    type ClientCertificate,
    type NetworkSettings,
} from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { networkFor, type NetworkDeps } from '../../src/network/network-for.js';
import { NetworkFileError } from '../../src/network/network-file-error.js';
import { writeNetworkSettings } from '../../src/network/network-store.js';

let userData: string;

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-dial-tls-'));
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

async function file(name: string, content: string): Promise<string> {
    const path = join(userData, name);

    await writeFile(path, content);

    return path;
}

function certificate(fields: Partial<ClientCertificate>): ClientCertificate {
    return { id: 'one', host: 'api.test', certPath: '', keyPath: '', pfxPath: '', ...fields };
}

describe('the certificates a url dials with', () => {
    /** Naming `ca` replaces the bundled roots in node: an added authority must not drop them. */
    it('trusts the added authorities beside the bundled ones', async () => {
        await settle({ caPaths: [await file('corp.pem', 'CORP-ROOT')] });

        const { tls } = await dial()('https://api.test');
        const ca = tls.ca ?? '';

        expect(ca).toContain('CORP-ROOT');
        expect(ca).toContain(rootCertificates[0]);
    });

    it('shows the certificate and the key of the host it matches, with its passphrase', async () => {
        await settle({
            clientCertificates: [
                certificate({
                    certPath: await file('c.pem', 'CERT'),
                    keyPath: await file('k.pem', 'KEY'),
                }),
            ],
        });

        const { tls } = await dial({ secrets: { 'network:certificate:one': 'pass' } })(
            'https://api.test',
        );

        expect(tls.cert).toBe('CERT');
        expect(tls.key).toBe('KEY');
        expect(tls.passphrase).toBe('pass');
    });

    it('shows a PKCS#12 bundle in place of the pair when one is named', async () => {
        await settle({
            clientCertificates: [certificate({ pfxPath: await file('id.p12', 'BUNDLE') })],
        });

        const { tls } = await dial()('https://api.test');

        expect(Buffer.from(tls.pfx ?? []).toString()).toBe('BUNDLE');
        expect(tls.cert).toBeUndefined();
        expect(tls.passphrase).toBeUndefined();
    });

    it('shows the first certificate whose host matches, in the order of the list', async () => {
        await settle({
            clientCertificates: [
                certificate({ id: 'a', host: 'other.test', pfxPath: await file('a.p12', 'A') }),
                certificate({ id: 'b', host: '*.api.test', pfxPath: await file('b.p12', 'B') }),
                certificate({ id: 'c', host: '*', pfxPath: await file('c.p12', 'C') }),
            ],
        });

        const { tls } = await dial()('https://v2.api.test');

        expect(Buffer.from(tls.pfx ?? []).toString()).toBe('B');
    });

    it('shows nothing while the pair is half chosen', async () => {
        await settle({
            clientCertificates: [certificate({ certPath: await file('c.pem', 'CERT') })],
        });

        await expect(dial()('https://api.test')).resolves.toEqual({ tls: {} });
    });

    /** Trusting less, or showing nothing, would be another request than the settings describe. */
    it('fails when a named file cannot be read', async () => {
        await settle({ caPaths: [join(userData, 'gone.pem')] });

        await expect(dial()('https://api.test')).rejects.toBeInstanceOf(NetworkFileError);
    });
});
