import { describe, expect, it } from 'vitest';

import { connectionUpdateRequestSchema } from '../../src/index.js';

describe('connection:update payload', () => {
    it('accepts a change set with a single field', () => {
        const parsed = connectionUpdateRequestSchema.parse({
            root: '/repos/demo',
            workspaceId: 'eventos',
            connectionId: 'gateway',
            changes: { name: 'Gateway nuevo' },
        });

        expect(parsed.changes).toEqual({ name: 'Gateway nuevo' });
    });

    it('accepts a change of transport', () => {
        expect(
            connectionUpdateRequestSchema.parse({
                workspaceId: 'eventos',
                connectionId: 'gateway',
                changes: { transport: 'socketio', url: 'http://localhost:3000' },
            }).changes,
        ).toEqual({ transport: 'socketio', url: 'http://localhost:3000' });
    });

    it('rejects a change the domain rejects, before any file is touched', () => {
        const result = connectionUpdateRequestSchema.safeParse({
            root: '/repos/demo',
            workspaceId: 'eventos',
            connectionId: 'gateway',
            changes: { url: 'ftp://nope' },
        });

        expect(result.success).toBe(false);
    });

    it('accepts selecting or inheriting an environment', () => {
        expect(
            connectionUpdateRequestSchema.parse({
                workspaceId: 'eventos',
                connectionId: 'gateway',
                changes: { environmentId: 'local' },
            }).changes,
        ).toEqual({ environmentId: 'local' });
        expect(
            connectionUpdateRequestSchema.parse({
                workspaceId: 'eventos',
                connectionId: 'gateway',
                changes: { environmentId: null },
            }).changes,
        ).toEqual({ environmentId: null });
    });

    it('accepts the scripts of the connection, and a null that clears them', () => {
        const scripts = { onMessage: { source: 'mandor.socket.send("pong");', enabled: false } };

        expect(
            connectionUpdateRequestSchema.parse({
                workspaceId: 'eventos',
                connectionId: 'gateway',
                changes: { scripts },
            }).changes,
        ).toEqual({ scripts });
        expect(
            connectionUpdateRequestSchema.parse({
                workspaceId: 'eventos',
                connectionId: 'gateway',
                changes: { scripts: null },
            }).changes,
        ).toEqual({ scripts: null });
    });
});
