import { describe, expect, it } from 'vitest';

import { wsOpenRequestSchema } from '../../src/index.js';

describe('ws:open payload', () => {
    it('accepts templates and the workspace/environment pair', () => {
        const parsed = wsOpenRequestSchema.parse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            template: { url: 'wss://{{host}}/socket', headers: { Authorization: '{{token}}' } },
            transport: 'websocket',
        });

        expect(parsed).toEqual({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            template: { url: 'wss://{{host}}/socket', headers: { Authorization: '{{token}}' } },
            transport: 'websocket',
        });
    });

    /** Resolved output must never be accepted from the renderer. */
    it('rejects the old payload carrying a resolved url', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            url: 'wss://echo.local',
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues[0]?.path).toEqual(['workspaceId']);
        }
    });

    it('rejects a non-websocket template', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            template: { url: 'https://echo.local' },
        });

        expect(result.success).toBe(false);
    });

    it('accepts a template that fills the port of the url', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            transport: 'websocket',
            template: { url: 'ws://{{host}}:{{port}}' },
        });

        expect(result.success).toBe(true);
    });

    it('accepts the options the connection dials with', () => {
        const parsed = wsOpenRequestSchema.parse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            keepalive: { intervalMs: 30_000, pongTimeoutMs: 10_000 },
            maximumMessageSizeBytes: 104_857_600,
            reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: 5 },
            transport: 'websocket',
            subprotocols: ['graphql-ws'],
            template: { url: 'wss://echo.local' },
            verifyCertificate: false,
        });

        expect(parsed.maximumMessageSizeBytes).toBe(104_857_600);
        expect(parsed.reconnect).toEqual({ baseMs: 500, ceilingMs: 8_000, maxAttempts: 5 });
        expect(parsed.keepalive).toEqual({ intervalMs: 30_000, pongTimeoutMs: 10_000 });
        expect(parsed.subprotocols).toEqual(['graphql-ws']);
        expect(parsed.verifyCertificate).toBe(false);
    });

    it('refuses an option nobody dialled with', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            maximumMessageSizeBytes: -1,
            transport: 'websocket',
            template: { url: 'ws://echo.local' },
        });

        expect(result.success).toBe(false);
    });

    it('takes a handshake wait between a millisecond and ten minutes', () => {
        const open = (handshakeTimeoutMs: number) =>
            wsOpenRequestSchema.safeParse({
                connectionId: 'gateway',
                handshakeTimeoutMs,
                transport: 'websocket',
                template: { url: 'ws://echo.local' },
                workspaceId: 'payments',
                environmentId: null,
            }).success;

        expect(open(5_000)).toBe(true);
        expect(open(0)).toBe(false);
        expect(open(600_001)).toBe(false);
    });

    it('refuses a reconnect policy with a negative attempt', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            reconnect: { baseMs: 500, ceilingMs: 8_000, maxAttempts: -1 },
            transport: 'websocket',
            template: { url: 'ws://echo.local' },
            workspaceId: 'payments',
            environmentId: null,
        });

        expect(result.success).toBe(false);
    });

    it('accepts a socket.io open that dials an http url with its own group', () => {
        const parsed = wsOpenRequestSchema.parse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            socketio: { namespace: '/admin', engineTransport: 'websocket-only' },
            transport: 'socketio',
            template: { url: 'https://echo.local' },
        });

        expect(parsed.socketio).toEqual({ namespace: '/admin', engineTransport: 'websocket-only' });
    });

    it('refuses a socket.io open whose template speaks the websocket scheme', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            transport: 'socketio',
            template: { url: 'ws://echo.local' },
        });

        expect(result.success).toBe(false);
    });

    it.each([
        { inherit: true },
        { type: 'none' },
        { type: 'apikey', name: 'key', value: '{{key}}', in: 'header' },
        { type: 'apikey', name: 'key', value: '{{key}}', in: 'query' },
    ])('keeps authentication supported by the handshake: %j', (auth) => {
        const parsed = wsOpenRequestSchema.parse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            transport: 'websocket',
            template: { url: 'wss://echo.local', auth },
        });

        expect(parsed.template.auth).toEqual(auth);
    });

    /** A cookie API key belongs to HTTP requests, not the socket handshake contract. */
    it('rejects a cookie API key at the authentication field', () => {
        const result = wsOpenRequestSchema.safeParse({
            connectionId: 'gateway',
            workspaceId: 'payments',
            environmentId: null,
            transport: 'websocket',
            template: {
                url: 'wss://echo.local',
                auth: { type: 'apikey', name: 'key', value: '{{key}}', in: 'cookie' },
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['template', 'auth'],
                message: 'a cookie does not apply to the handshake',
            }),
        ]);
    });
});
