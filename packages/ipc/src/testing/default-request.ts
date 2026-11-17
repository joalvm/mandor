import type { HttpResponse } from '@mandor/schema';

import type { RequestArea } from '../request/request-area.js';
import { success } from '../result/success.js';

/** The smallest response its own channel accepts: a 200 with nothing in it. */
function emptyResponse(): HttpResponse {
    return {
        status: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers: [],
        body: null,
        sizes: { transferredBytes: 0, bodyBytes: 0, decoded: true },
        timings: { dnsMs: 0, connectMs: 0, tlsMs: 0, firstByteMs: 0, totalMs: 0, viaProxy: false },
        redirects: [],
        cookies: [],
    };
}

/**
 * The request area a test gets when it says nothing about requests: every method answers
 * success with the smallest value its channel accepts, so what a test passes as an override is
 * the only thing it is saying.
 */
export function defaultRequest(): RequestArea {
    return {
        send: () => Promise.resolve(success(emptyResponse())),
        cancel: () => Promise.resolve(success({})),
        readBody: () => Promise.resolve(success({ encoding: 'utf8', text: '', total: 0 })),
        saveBody: () => Promise.resolve(success({ path: null })),
        hideSecrets: (response) => Promise.resolve(success(response)),
        onScriptOutput: () => () => undefined,
    };
}
