import { SyncSendError } from '../send/sync-send-error.js';

/**
 * The single gate between user input and the socket. Only `http:` and `https:` pass: anything
 * else (`ftp:`, `file:`, `javascript:`) never touches the network. The URL is not repaired:
 * a user who typed something else sees an error, not a silent rewrite. No refusal repeats the
 * url: its message reaches the log, and what was typed may hold a password.
 */
export function assertHttpUrl(value: string): URL {
    let url: URL;

    try {
        url = new URL(value);
    } catch {
        throw new SyncSendError('scheme', 'refused a request URL that does not parse');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new SyncSendError('scheme', `refused the scheme ${url.protocol} of a request URL`);
    }

    return url;
}
