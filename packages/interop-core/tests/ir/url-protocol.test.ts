import { describe, expect, it } from 'vitest';

import { urlProtocolOf } from '../../src/ir/url-protocol.js';

describe('the protocol an address speaks', () => {
    it.each([
        ['https://api.example.com/v1', 'https'],
        ['WSS://pasarela.example', 'wss'],
        ['socket.io+tls://host', 'socket.io+tls'],
    ])('reads the scheme of %s as %s', (url, protocol) => {
        expect(urlProtocolOf(url)).toBe(protocol);
    });

    it.each(['/v1', '{scheme}://host/api', 'host.example.com'])(
        'takes %s for the web, since it carries no scheme of its own',
        (url) => {
            expect(urlProtocolOf(url)).toBe('http');
        },
    );
});
