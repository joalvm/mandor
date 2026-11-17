import http from 'node:http';
import type { Dispatcher } from 'undici';

import type { ReadBodyOutcome } from '../body/read-body.js';
import type { ConnectionPhases } from '../timing/connection-phases.js';
import type { SyncRequest } from '../request/sync-request.js';
import type { SyncResponse } from '../response/sync-response.js';
import { headersForUrl } from '../url/url-authorization.js';
import { headSizesOf } from './head-sizes.js';
import type { RawResponseHandler } from './response-handler.js';

/** Every `content-encoding` value of the response, split and in order; the reader refuses unknown ones. */
export function encodingsOf(headers: readonly (readonly [string, string])[]): string[] {
    return headers
        .filter(([name]) => name.toLowerCase() === 'content-encoding')
        .flatMap(([, value]) => value.split(','))
        .map((encoding) => encoding.trim())
        .filter((encoding) => encoding !== '');
}

/** The version the connection agreed on through ALPN. No agreement is HTTP/1.1. */
const HTTP_VERSION_OF_ALPN: ReadonlyMap<string | null, SyncResponse['httpVersion']> = new Map([
    ['h2', '2'],
]);

export function responseOf(
    handler: RawResponseHandler,
    phases: ConnectionPhases,
    body: ReadBodyOutcome,
    request: SyncRequest,
): SyncResponse {
    const { status, headers } = handler.head;
    const raw = handler.head.statusText;
    const statusText = raw === '' ? (http.STATUS_CODES[status] ?? '') : raw;

    return {
        status,
        statusText,
        httpVersion: HTTP_VERSION_OF_ALPN.get(phases.alpnProtocol) ?? '1.1',
        headers,
        body: body.body,
        sizes: { ...body.sizes, ...headSizesOf(request, { status, statusText, headers }) },
        timings: {
            dnsMs: phases.dnsMs,
            connectMs: phases.connectMs,
            tlsMs: phases.tlsMs,
            firstByteMs: Math.max(0, phases.firstByteAt - phases.lastPhaseEndAt),
            totalMs: 0,
            viaProxy: request.proxy !== undefined,
        },
        redirects: [],
        ...(phases.network === null ? {} : { network: phases.network }),
    };
}

/** The request head and body undici sends, or nothing when the request carries no body. */
export function dispatchOptionsOf(request: SyncRequest, url: URL): Dispatcher.DispatchOptions {
    const options: Dispatcher.DispatchOptions = {
        origin: url.origin,
        path: `${url.pathname}${url.search}`,
        method: request.method,
        headers: headersForUrl(request.headers, url)
            .map(([name, value]) => [name, value])
            .flat(),
    };

    if (request.body !== undefined) {
        options.body = request.body;
    }

    return options;
}
