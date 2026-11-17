import { describe, expect, it } from 'vitest';

import { connectionCreateRequestSchema } from '../../src/index.js';

describe('connection:create payload', () => {
    it('accepts a name, a websocket url and headers', () => {
        const parsed = connectionCreateRequestSchema.parse({
            root: '/repos/demo',
            workspaceId: 'eventos',
            name: 'Gateway local',
            url: 'ws://localhost:8080',
            headers: [{ key: 'authorization', value: 'Bearer x', enabled: true }],
        });

        expect(parsed.name).toBe('Gateway local');
    });

    it('rejects a url that speaks no transport scheme', () => {
        const result = connectionCreateRequestSchema.safeParse({
            root: '/repos/demo',
            workspaceId: 'eventos',
            name: 'Gateway local',
            url: 'ftp://localhost:8080',
        });

        expect(result.success).toBe(false);
    });

    it('accepts an http url when the transport is socket.io', () => {
        const parsed = connectionCreateRequestSchema.parse({
            root: '/repos/demo',
            workspaceId: 'eventos',
            name: 'Gateway local',
            url: 'http://localhost:8080',
            transport: 'socketio',
        });

        expect(parsed.transport).toBe('socketio');
    });

    it('rejects a transport the domain does not know', () => {
        const result = connectionCreateRequestSchema.safeParse({
            root: '/repos/demo',
            workspaceId: 'eventos',
            name: 'Gateway local',
            url: 'ws://localhost:8080',
            transport: 'sse',
        });

        expect(result.success).toBe(false);
    });
});
