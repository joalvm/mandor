import { describe, expect, it } from 'vitest';

import {
    connectionListRequestSchema,
    connectionListResultSchema,
} from '../../src/connection/connection-list.js';

const CONNECTION = {
    id: 'gateway',
    name: 'Gateway',
    url: 'ws://localhost:8080',
    headers: [],
    environmentId: null,
};

describe('connectionListRequestSchema', () => {
    it('asks for the connections of one workspace', () => {
        expect(connectionListRequestSchema.parse({ workspaceId: 'eventos' })).toEqual({
            workspaceId: 'eventos',
        });
    });

    it('refuses a workspace that is not an id', () => {
        expect(connectionListRequestSchema.safeParse({ workspaceId: 'Eventos 1' }).success).toBe(
            false,
        );
    });
});

describe('connectionListResultSchema', () => {
    it('answers with the connections as the domain reads them, websocket by default', () => {
        const answer = connectionListResultSchema.parse({ ok: true, value: [CONNECTION] });

        expect(answer).toMatchObject({
            ok: true,
            value: [{ id: 'gateway', transport: 'websocket' }],
        });
    });

    it('refuses a connection whose url does not fit its transport', () => {
        const stray = { ...CONNECTION, url: 'http://localhost:8080' };

        expect(connectionListResultSchema.safeParse({ ok: true, value: [stray] }).success).toBe(
            false,
        );
    });

    it('answers a failure with a code', () => {
        const failure = { ok: false, error: { code: 'not-found', message: 'no workspace' } };

        expect(connectionListResultSchema.parse(failure)).toEqual(failure);
    });
});
