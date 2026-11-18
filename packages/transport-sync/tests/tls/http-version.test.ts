import { describe, expect, it } from 'vitest';

import { alpnProtocolsOf, httpVersionRefusal } from '../../src/tls/http-version.js';

describe('alpnProtocolsOf', () => {
    it('offers both protocols on auto, and only the one a held version names', () => {
        expect(alpnProtocolsOf('auto')).toEqual(['h2', 'http/1.1']);
        expect(alpnProtocolsOf('http1')).toEqual(['http/1.1']);
        expect(alpnProtocolsOf('http2')).toEqual(['h2']);
    });

    it('hands out a list the caller may change without touching the next offer', () => {
        alpnProtocolsOf('auto').pop();

        expect(alpnProtocolsOf('auto')).toEqual(['h2', 'http/1.1']);
    });
});

describe('httpVersionRefusal', () => {
    it('lets every connection through when the version is not held to h2', () => {
        expect(httpVersionRefusal('auto', null)).toBeNull();
        expect(httpVersionRefusal('http1', 'http/1.1')).toBeNull();
    });

    it('lets an h2 connection through when the version demands it', () => {
        expect(httpVersionRefusal('http2', 'h2')).toBeNull();
    });

    it('refuses a connection that speaks something else, with the code the reason map reads', () => {
        const refusal = httpVersionRefusal('http2', 'http/1.1');

        expect(refusal?.code).toBe('ERR_HTTP_VERSION_REFUSED');
        expect(refusal?.message).toContain('http/1.1');
    });

    it('refuses a connection that negotiated nothing as HTTP/1.1', () => {
        expect(httpVersionRefusal('http2', null)?.message).toBe(
            'the connection speaks http/1.1, not h2',
        );
    });
});
