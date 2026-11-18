import { describe, expect, it } from 'vitest';

import { applyCspHeaders, type HeadersListener } from '../../src/window/apply-csp-headers.js';

type WebRequestSpy = {
    listener: HeadersListener | null;
    onHeadersReceived: (listener: HeadersListener | null) => void;
};

function spyWebRequest(): WebRequestSpy {
    const spy: WebRequestSpy = {
        listener: null,
        onHeadersReceived: (listener) => {
            spy.listener = listener;
        },
    };

    return spy;
}

const NONCE = 'ZmFrZS1ub25jZS0xMjM0';

describe('the policy header of the session', () => {
    /**
     * The policy travels as a response header instead of a meta tag: a meta tag is part of the
     * document, and a document that can be tampered with can drop it.
     */
    it('answers every response with the policy of its mode', () => {
        const webRequest = spyWebRequest();
        let answered: Record<string, string[]> | undefined;

        applyCspHeaders(webRequest, 'production', NONCE);
        webRequest.listener?.({ responseHeaders: { 'X-Kept': ['yes'] } }, (response) => {
            answered = response.responseHeaders;
        });

        expect(answered?.['Content-Security-Policy']?.[0]).toContain("default-src 'self'");
        expect(answered?.['Content-Security-Policy']?.[0]).toContain(`'nonce-${NONCE}'`);
        expect(answered?.['X-Kept']).toEqual(['yes']);
    });

    /**
     * The listener belongs to the session, not to the window, so closing the window leaves it
     * behind. What the host disposes has to take it with it.
     */
    it('leaves the session without a listener once it is disposed', () => {
        const webRequest = spyWebRequest();

        applyCspHeaders(webRequest, 'production', NONCE)();

        expect(webRequest.listener).toBeNull();
    });
});
