import { z } from 'zod';

/**
 * Where a request finds its proxy: what the operating system says (its settings, its PAC), what
 * the `HTTP_PROXY` family of the environment says, the one written here, or none at all.
 */
export const PROXY_MODES = ['system', 'environment', 'custom', 'none'] as const;

export type ProxyMode = (typeof PROXY_MODES)[number];

/** The schemes a written proxy may speak: HTTP tunnels and SOCKS, the ones both apps dial. */
const PROXY_SCHEMES = ['http:', 'https:', 'socks4:', 'socks4a:', 'socks5:', 'socks5h:'];

/** A host a setting names: `api.example.com`, `*.example.com`, `.example.com`, `10.0.0.1:8443`. */
export const HOST_PATTERN = /^(\*|\*?\.?[\w.-]+|\[[\da-f:.]+\])(:\d{1,5})?$/iu;

export type ProxySettings = {
    mode: ProxyMode;
    /** The written proxy, `scheme://host:port`; read only while the mode is `custom`. */
    url: string;
    /** The hosts a written proxy leaves alone: they go direct. */
    bypass: string[];
    /** Who the written proxy asks for; empty asks nothing. The password is kept by the keychain. */
    username: string;
};

/**
 * The certificate one host asks the client for. Either a PEM pair or a PKCS#12 bundle; the
 * passphrase that opens the key, when there is one, is kept by the keychain under its id.
 */
export type ClientCertificate = {
    id: string;
    host: string;
    certPath: string;
    keyPath: string;
    pfxPath: string;
};

/**
 * How the requests of the app reach the network: through which proxy, trusting which
 * authorities beside the ones of the system, and showing which certificate to which host.
 * The settings of this machine, kept beside the app and never in an origin: the paths name
 * files of this machine.
 */
export type NetworkSettings = {
    proxy: ProxySettings;
    /** PEM files of authorities trusted beside the bundled ones. */
    caPaths: string[];
    clientCertificates: ClientCertificate[];
};

export const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
    proxy: { mode: 'system', url: '', bypass: [], username: '' },
    caPaths: [],
    clientCertificates: [],
};

function isProxyUrl(value: string): boolean {
    if (value === '') {
        return true;
    }

    try {
        const url = new URL(value);

        return PROXY_SCHEMES.includes(url.protocol) && url.hostname !== '';
    } catch {
        return false;
    }
}

const hostPatternSchema = z.string().max(260).regex(HOST_PATTERN);
const pathSchema = z.string().max(4096);

export const proxySettingsSchema = z.object({
    mode: z.enum(PROXY_MODES),
    url: z.string().max(2048).refine(isProxyUrl, 'a proxy is scheme://host:port'),
    bypass: z.array(hostPatternSchema).max(256),
    username: z.string().max(256),
});

export const clientCertificateSchema = z.object({
    id: z.string().regex(/^[\w-]{1,64}$/u),
    host: hostPatternSchema,
    certPath: pathSchema,
    keyPath: pathSchema,
    pfxPath: pathSchema,
});

export const networkSettingsSchema = z.object({
    proxy: proxySettingsSchema,
    caPaths: z.array(pathSchema.min(1)).max(64),
    clientCertificates: z.array(clientCertificateSchema).max(256),
});
