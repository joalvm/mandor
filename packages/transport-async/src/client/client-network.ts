/**
 * The trust a socket dials with beyond the system store: an authority of its own, and the
 * certificate it proves itself with when the server asks for one. PEM text, or a PKCS#12 bundle
 * as bytes; the passphrase opens whichever key came encrypted.
 */
export type ClientTls = {
    ca?: string | undefined;
    cert?: string | undefined;
    key?: string | undefined;
    pfx?: Uint8Array | undefined;
    passphrase?: string | undefined;
};

/**
 * The proxy a socket tunnels through, as a url: `http:` and `https:` speak CONNECT, `socks5:`,
 * `socks5h:` and `socks4:` speak SOCKS. Credentials ride in the url, the way every proxy takes
 * them.
 */
export type ClientProxy = {
    url: string;
};

/** How long the handshake may take before the attempt is given up as unanswered. */
export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 20_000;

/** What the TLS of node takes: the same trust, with the bundle as the Buffer it reads. */
export type NodeTlsOptions = {
    ca?: string;
    cert?: string;
    key?: string;
    pfx?: Buffer;
    passphrase?: string;
};

/** The trust the request names, and nothing it left out: an absent field is the system's. */
export function tlsOptionsOf(tls: ClientTls | undefined): NodeTlsOptions {
    const { ca, cert, key, pfx, passphrase } = tls ?? {};

    return {
        ...(ca === undefined ? {} : { ca }),
        ...(cert === undefined ? {} : { cert }),
        ...(key === undefined ? {} : { key }),
        ...(pfx === undefined ? {} : { pfx: Buffer.from(pfx) }),
        ...(passphrase === undefined ? {} : { passphrase }),
    };
}
