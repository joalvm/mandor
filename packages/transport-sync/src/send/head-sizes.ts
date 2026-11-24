import type { SyncRequest } from '../request/sync-request.js';

/**
 * How big the heads of the exchange were, counted as HTTP/1.1 text: the start line, one line
 * per header and the blank line that closes them. Over HTTP/2 the wire compresses heads, so
 * the count is what the head says, not what it cost. The request head adds the `host` line
 * and, with a body, the `content-length` line the transport writes on its own.
 */
export type SyncHeadSizes = {
    headerBytes: number;
    requestHeaderBytes: number;
    requestBodyBytes: number;
};

type Head = {
    status: number;
    statusText: string;
    headers: readonly (readonly [string, string])[];
};

const CRLF = 2;

function linesBytes(headers: readonly (readonly [string, string])[]): number {
    return headers.reduce(
        (sum, [name, value]) => sum + Buffer.byteLength(`${name}: ${value}`) + CRLF,
        CRLF,
    );
}

export function headSizesOf(
    request: Pick<SyncRequest, 'body' | 'headers' | 'method' | 'url'>,
    head: Head,
): SyncHeadSizes {
    const url = new URL(request.url);
    const bodyBytes = request.body?.byteLength ?? 0;
    const added: [string, string][] = [['host', url.host]];

    if (request.body !== undefined) {
        added.push(['content-length', String(bodyBytes)]);
    }

    const requestLine = `${request.method} ${url.pathname}${url.search} HTTP/1.1`;
    const statusLine = `HTTP/1.1 ${String(head.status)} ${head.statusText}`;

    return {
        headerBytes: Buffer.byteLength(statusLine) + CRLF + linesBytes(head.headers),
        requestHeaderBytes:
            Buffer.byteLength(requestLine) + CRLF + linesBytes([...added, ...request.headers]),
        requestBodyBytes: bodyBytes,
    };
}
