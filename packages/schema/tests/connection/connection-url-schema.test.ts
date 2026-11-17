import { describe, expect, it } from 'vitest';

import { connectionUrlSchema, urlMatchesTransport } from '../../src/index.js';

describe('connectionUrlSchema', () => {
    it.each(['ws://localhost:8080', 'wss://example.com/socket', 'https://example.com'])(
        'accepts %s',
        (url) => {
            expect(connectionUrlSchema.safeParse(url).success).toBe(true);
        },
    );

    it.each([
        'ws://{{host}}:{{port}}',
        'wss://{{host}}/socket',
        'https://{{base_url}}/session',
        'ws://{{ho',
    ])('accepts the template %s before it resolves', (url) => {
        expect(connectionUrlSchema.safeParse(url).success).toBe(true);
    });

    it.each(['ftp://example.com', 'example.com/socket', 'ws://'])('rejects %s', (url) => {
        expect(connectionUrlSchema.safeParse(url).success).toBe(false);
    });
});

describe('urlMatchesTransport', () => {
    it('holds a websocket url against the websocket transport', () => {
        expect(urlMatchesTransport('websocket', 'ws://localhost:8080')).toBe(true);
        expect(urlMatchesTransport('websocket', 'wss://example.com')).toBe(true);
    });

    it('holds an http url against the socket.io transport', () => {
        expect(urlMatchesTransport('socketio', 'http://localhost:3000')).toBe(true);
        expect(urlMatchesTransport('socketio', 'https://example.com')).toBe(true);
    });

    it('refuses the scheme of the other family', () => {
        expect(urlMatchesTransport('websocket', 'http://localhost:3000')).toBe(false);
        expect(urlMatchesTransport('socketio', 'ws://localhost:8080')).toBe(false);
    });
});
