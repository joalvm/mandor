import { withCookieHeader } from './with-cookie-header.js';
import type { SyncRequest } from '../request/sync-request.js';
import type { SyncResponse } from '../response/sync-response.js';

function setCookiesOf(response: SyncResponse): string[] {
    return response.headers
        .filter(([name]) => name.toLowerCase() === 'set-cookie')
        .map(([, value]) => value);
}

/**
 * One send of one hop, with the jar on both sides: before it, the jar's cookies for this very
 * URL join the request; after it, every `Set-Cookie` of the answer — a 3xx included — goes to
 * the jar. Without a port the request goes as it is.
 */
export async function sendWithCookies(
    request: SyncRequest,
    sendOne: (request: SyncRequest) => Promise<SyncResponse>,
): Promise<SyncResponse> {
    const { cookies } = request;

    if (cookies === undefined) {
        return sendOne(request);
    }

    const headers = withCookieHeader(request.headers, await cookies.header(request.url));
    const response = await sendOne({ ...request, headers });

    await cookies.store(request.url, setCookiesOf(response));

    return response;
}
