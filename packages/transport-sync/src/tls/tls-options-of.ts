import type { SyncHttpVersion, SyncRequest, SyncTlsVersion } from '../request/sync-request.js';
import { alpnProtocolsOf } from './http-version.js';

/** The TLS settings of one request, as a connector and a proxy agent both take them. */
export type RequestTlsOptions = {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    pfx?: Buffer;
    passphrase?: string;
    minVersion?: SyncTlsVersion;
    maxVersion?: SyncTlsVersion;
    ciphers?: string;
    ALPNProtocols: string[];
};

/** The bounds and the suites of the handshake, each only when the request names it. */
function handshakeOf(settings: SyncRequest['tls']): Partial<RequestTlsOptions> {
    const { minVersion, maxVersion, ciphers } = settings;

    return {
        ...(minVersion === undefined ? {} : { minVersion }),
        ...(maxVersion === undefined ? {} : { maxVersion }),
        ...(ciphers === undefined || ciphers === '' ? {} : { ciphers }),
    };
}

/**
 * The TLS of the request, and nothing else: verify decides rejection, a private CA and a client
 * certificate ride along only when the request names them, as do the bounds of the version and
 * the cipher suites, and ALPN offers what the HTTP
 * version lets the server pick. The settings are per request — one
 * request trusting nothing cannot make the next one trust the same way, because no option
 * outlives its `Dispatcher`.
 */
export function tlsOptionsOf(
    settings: SyncRequest['tls'],
    httpVersion: SyncHttpVersion = 'auto',
): RequestTlsOptions {
    const authority = settings.ca === undefined ? {} : { ca: settings.ca };
    const { pfx, ...pem } = settings.clientCert ?? {};
    const client = pfx === undefined ? pem : { ...pem, pfx: Buffer.from(pfx) };

    return {
        rejectUnauthorized: settings.verify,
        ALPNProtocols: alpnProtocolsOf(httpVersion),
        ...authority,
        ...client,
        ...handshakeOf(settings),
    };
}
