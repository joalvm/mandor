import { contentSecurityPolicy, type CspMode } from './content-security-policy.js';

type Headers = Record<string, string[]>;

/** What Electron hands a headers listener, reduced to the part the policy touches. */
export type HeadersListener = (
    details: { responseHeaders?: Headers },
    callback: (response: { responseHeaders?: Headers }) => void,
) => void;

/**
 * The slice of `session.webRequest` that installs and removes the listener, named structurally
 * so the policy can be exercised without a session.
 */
export type HeadersTarget = {
    onHeadersReceived: (listener: HeadersListener | null) => void;
};

/**
 * Answers every response of the session with the policy, and gives back the only thing that
 * undoes it. The policy travels as a response header instead of a meta tag: a meta tag is part
 * of the document, and a document that can be tampered with can drop it.
 *
 * The listener belongs to the session and not to the window, so closing the window leaves it
 * installed. Whoever disposes the host has to take it with them.
 *
 * The nonce is the one the document was served with. The two have to be the same value or the
 * window refuses the very stylesheet it was handed.
 */
export function applyCspHeaders(
    webRequest: HeadersTarget,
    mode: CspMode,
    nonce: string,
): () => void {
    const policy = contentSecurityPolicy(mode, nonce);

    webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [policy],
            },
        });
    });

    return () => {
        webRequest.onHeadersReceived(null);
    };
}
