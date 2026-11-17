import { describe, expect, it } from 'vitest';

import { assertSocketUrl } from '../../src/index.js';
import { SocketUrlError } from '../../src/url/socket-url-error.js';
import type { SocketTransport } from '../../src/url/assert-socket-url.js';

/** Everything the refusal of `value` carries out: its message, its stack and each field of its own. */
function carriedBy(transport: SocketTransport, value: string): string {
    try {
        assertSocketUrl(transport, value);
    } catch (error) {
        return JSON.stringify(error, Object.getOwnPropertyNames(error));
    }

    throw new Error('the url was let through');
}

describe('assertSocketUrl', () => {
    it('lets a websocket url through when the transport dials websocket', () => {
        expect(assertSocketUrl('websocket', 'ws://localhost:3000/socket').protocol).toBe('ws:');
        expect(assertSocketUrl('websocket', 'wss://example.com').protocol).toBe('wss:');
    });

    it('lets an http url through when the transport dials socket.io', () => {
        expect(assertSocketUrl('socketio', 'http://localhost:3000').protocol).toBe('http:');
        expect(assertSocketUrl('socketio', 'https://example.com/chat').protocol).toBe('https:');
    });

    it('keeps the path and the query of what it lets through', () => {
        const url = assertSocketUrl('websocket', 'wss://example.com/socket?token=abc');

        expect(url.pathname).toBe('/socket');
        expect(url.search).toBe('?token=abc');
    });

    it.each(['', 'ws://', 'javascript:alert(1)'])(
        'refuses %j before any socket dials it',
        (value) => {
            expect(() => {
                assertSocketUrl('websocket', value);
            }).toThrow(SocketUrlError);
        },
    );

    it('refuses the scheme the transport does not dial', () => {
        expect(() => {
            assertSocketUrl('websocket', 'https://example.com');
        }).toThrow(SocketUrlError);
        expect(() => {
            assertSocketUrl('socketio', 'ws://example.com');
        }).toThrow(SocketUrlError);
        expect(() => {
            assertSocketUrl('socketio', 'file:///etc/passwd');
        }).toThrow(SocketUrlError);
    });

    it('lets through a url that carries its credentials', () => {
        expect(assertSocketUrl('socketio', 'http://user:pass@example.com').host).toBe(
            'example.com',
        );
        expect(assertSocketUrl('websocket', 'ws://user:pass@example.com').host).toBe('example.com');
    });

    /** The message reaches the log and the activity, and a refused url may still hold a password. */
    it.each([
        ['websocket', 'ftp://user:secret@example.com/'],
        ['socketio', 'user:secret@example.com'],
        ['websocket', 'ws//user:secret@example.com'],
    ] as const)('carries nothing the url held when %s refuses %s', (transport, value) => {
        expect(carriedBy(transport, value)).not.toContain('secret');
    });

    it('refuses a string that is not a url at all', () => {
        expect(() => {
            assertSocketUrl('socketio', 'not a url');
        }).toThrow(SocketUrlError);
    });
});
