import { sendAuthorized } from '../auth/send-authorized.js';
import { sendWithCookies } from '../cookie/send-with-cookies.js';
import type { RedirectHop } from './redirect-hop.js';
import { heldByGuard, redirectedRequest } from './redirected-request.js';
import type { SyncRequest } from '../request/sync-request.js';
import type { SyncResponse } from '../response/sync-response.js';
import { SyncSendError } from '../send/sync-send-error.js';

/** One send of one hop. The transport closes over its agent and timings; the loop sees only this. */
export type SendOne = (request: SyncRequest) => Promise<SyncResponse>;

export type RedirectedOutcome = {
    /** The response of the last hop, or of the only send when nothing was followed. */
    response: SyncResponse;
    hops: RedirectHop[];
    /** The URL whose 3xx was not followed because the hop would take a secret elsewhere. */
    heldAt?: string;
};

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

function locationOf(headers: readonly (readonly [string, string])[]): string | undefined {
    const found = headers.find(([name]) => name.toLowerCase() === 'location');

    return found?.[1];
}

/**
 * The redirect loop: send, and while the response redirects and the request says follow,
 * build the next request and send it. Each hop of the first origin carries the credentials its
 * scheme works out against it, a Digest retry included. The three security rules (scheme, downgrade,
 * credentials) live in `redirectedRequest`, so no consumer can skip them. Passing the
 * maximum dies with `redirect-limit`; a 3xx without location is answered as-is, because
 * there is nothing to follow. A hop the guard of a send a script shaped holds is answered as-is
 * too, with `heldAt` naming where it stopped.
 */
export async function followRedirects(
    request: SyncRequest,
    sendOne: SendOne,
): Promise<RedirectedOutcome> {
    const hops: RedirectHop[] = [];
    const origin = new URL(request.url).origin;
    let current = request;

    for (;;) {
        const response = await sendAuthorized(current, origin, (one) =>
            sendWithCookies(one, sendOne),
        );

        if (!REDIRECT_STATUS.has(response.status) || !current.redirects.follow) {
            return { response, hops };
        }

        if (hops.length >= current.redirects.max) {
            throw new SyncSendError(
                'redirect-limit',
                `more than ${String(current.redirects.max)} redirects`,
            );
        }

        const location = locationOf(response.headers);

        if (location === undefined) {
            return { response, hops };
        }

        if (heldByGuard(current, response.status, location)) {
            return { response, hops, heldAt: current.url };
        }

        const { request: next, strippedHeaders } = redirectedRequest(
            current,
            response.status,
            location,
        );

        hops.push({ status: response.status, from: current.url, to: next.url, strippedHeaders });
        current = next;
    }
}
