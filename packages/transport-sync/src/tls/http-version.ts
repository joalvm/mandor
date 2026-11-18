import type { SyncHttpVersion } from '../request/sync-request.js';

const ALPN_OF: Record<SyncHttpVersion, string[]> = {
    auto: ['h2', 'http/1.1'],
    http1: ['http/1.1'],
    http2: ['h2'],
};

/** What the TLS handshake offers by ALPN: the protocols the version lets the server pick from. */
export function alpnProtocolsOf(version: SyncHttpVersion): string[] {
    return [...ALPN_OF[version]];
}

/**
 * The refusal of a connection that does not speak what the request demands, or `null` when it
 * does. Only `http2` demands: a server that answered by ALPN with something else, or that did
 * not answer, or a plain socket without TLS, are not HTTP/2, and the send dies before a byte
 * of the request is written instead of going out over HTTP/1.1 unseen.
 */
export function httpVersionRefusal(
    version: SyncHttpVersion,
    alpnProtocol: string | null,
): NodeJS.ErrnoException | null {
    if (version !== 'http2' || alpnProtocol === 'h2') {
        return null;
    }

    const error: NodeJS.ErrnoException = new Error(
        `the connection speaks ${alpnProtocol ?? 'http/1.1'}, not h2`,
    );

    error.code = 'ERR_HTTP_VERSION_REFUSED';

    return error;
}
