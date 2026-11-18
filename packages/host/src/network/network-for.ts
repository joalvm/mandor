import { readFile } from 'node:fs/promises';
import { rootCertificates } from 'node:tls';

import type { ClientCertificate, NetworkSettings, ProxyMode } from '@mandor/schema';

import { environmentProxyOf, type ProcessEnvironment } from './environment-proxy.js';
import { hostMatches } from './host-matches.js';
import { NetworkFileError } from './network-file-error.js';
import { passphraseKey, PROXY_PASSWORD_KEY, readNetworkSettings } from './network-store.js';
import { pacProxyOf } from './pac-proxy.js';

/**
 * The certificate material one dial carries, read from disk: PEM as the text it is, a PKCS#12
 * bundle as its bytes, and the passphrase unsealed.
 */
export type DialTls = {
    ca?: string;
    cert?: string;
    key?: string;
    pfx?: Uint8Array;
    passphrase?: string;
};

/** How one url reaches the network: the proxy it tunnels through, if any, and its TLS. */
export type DialNetwork = {
    proxy?: { url: string };
    tls: DialTls;
};

/** How a url reaches the network on this machine: the proxy and the certificates it dials with. */
export type NetworkFor = (url: string) => Promise<DialNetwork>;

/** What finding the network of a url asks of the machine. */
export type NetworkDeps = {
    userDataDir: string;
    /** What the system says of a url, as a PAC answer. */
    resolveProxy: (url: string) => Promise<string>;
    env: ProcessEnvironment;
    readSecret: (key: string) => Promise<string | null>;
};

type ProxyContext = { deps: NetworkDeps; settings: NetworkSettings; target: URL };

/** The system answers for http and https; a socket asks as the scheme it upgrades from. */
function askedAsHttp(target: URL): string {
    return target.href.replace(/^ws/u, 'http');
}

async function writtenProxy({ deps, settings, target }: ProxyContext): Promise<string | undefined> {
    const { url, bypass, username } = settings.proxy;

    if (url === '' || bypass.some((pattern) => hostMatches(pattern, target))) {
        return undefined;
    }

    const proxy = new URL(url);

    if (username !== '') {
        proxy.username = username;
        proxy.password = (await deps.readSecret(PROXY_PASSWORD_KEY)) ?? '';
    }

    return proxy.href;
}

const PROXY_OF_MODE: Record<ProxyMode, (context: ProxyContext) => Promise<string | undefined>> = {
    system: async ({ deps, target }) => pacProxyOf(await deps.resolveProxy(askedAsHttp(target))),
    environment: ({ deps, target }) => Promise.resolve(environmentProxyOf(deps.env, target)),
    custom: writtenProxy,
    none: () => Promise.resolve(undefined),
};

async function fileOf(path: string): Promise<Buffer> {
    try {
        return await readFile(path);
    } catch (error) {
        throw new NetworkFileError(path, error);
    }
}

/** The bundled authorities and the ones the settings add: naming `ca` alone would replace them. */
async function authorityOf(paths: readonly string[]): Promise<Partial<DialTls>> {
    if (paths.length === 0) {
        return {};
    }

    const added = await Promise.all(paths.map(fileOf));
    const pems = [...rootCertificates, ...added.map((bytes) => bytes.toString('utf8'))];

    return { ca: pems.join('\n') };
}

async function clientOf(
    deps: NetworkDeps,
    certificate: ClientCertificate | undefined,
): Promise<Partial<DialTls>> {
    if (certificate === undefined) {
        return {};
    }

    const passphrase = (await deps.readSecret(passphraseKey(certificate.id))) ?? undefined;
    const sealed = passphrase === undefined ? {} : { passphrase };

    if (certificate.pfxPath !== '') {
        return { pfx: await fileOf(certificate.pfxPath), ...sealed };
    }

    if (certificate.certPath === '' || certificate.keyPath === '') {
        return {};
    }

    const [cert, key] = await Promise.all([
        fileOf(certificate.certPath),
        fileOf(certificate.keyPath),
    ]);

    return { cert: cert.toString('utf8'), key: key.toString('utf8'), ...sealed };
}

/**
 * How a url reaches the network by the settings of this machine, read at the moment it dials:
 * a change in the settings applies to the next request without a restart. The first client
 * certificate whose host matches is the one shown; the order of the list decides.
 */
export function networkFor(deps: NetworkDeps): NetworkFor {
    return async (url) => {
        const target = new URL(url);
        const settings = await readNetworkSettings(deps.userDataDir);
        const proxy = await PROXY_OF_MODE[settings.proxy.mode]({ deps, settings, target });
        const certificate = settings.clientCertificates.find((entry) =>
            hostMatches(entry.host, target),
        );
        const tls = {
            ...(await authorityOf(settings.caPaths)),
            ...(await clientOf(deps, certificate)),
        };

        return proxy === undefined ? { tls } : { proxy: { url: proxy }, tls };
    };
}
