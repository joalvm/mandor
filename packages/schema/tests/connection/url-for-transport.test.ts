import { describe, expect, it } from 'vitest';

import { urlForTransport } from '../../src/index.js';

describe('urlForTransport', () => {
    it('turns a websocket scheme into http when the transport is socket.io', () => {
        expect(urlForTransport('ws://localhost:3000', 'socketio')).toBe('http://localhost:3000');
        expect(urlForTransport('wss://example.com/socket', 'socketio')).toBe(
            'https://example.com/socket',
        );
    });

    it('turns an http scheme into ws when the transport is websocket', () => {
        expect(urlForTransport('http://localhost:3000', 'websocket')).toBe('ws://localhost:3000');
        expect(urlForTransport('https://example.com', 'websocket')).toBe('wss://example.com');
    });

    it('leaves a url that already speaks the transport scheme alone', () => {
        expect(urlForTransport('ws://localhost:3000', 'websocket')).toBe('ws://localhost:3000');
        expect(urlForTransport('https://example.com', 'socketio')).toBe('https://example.com');
    });

    it('leaves a url without a known scheme alone', () => {
        expect(urlForTransport('example.com/socket', 'socketio')).toBe('example.com/socket');
    });
});
