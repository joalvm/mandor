import { describe, expect, it } from 'vitest';

import { parseConnection } from '../../src/index.js';
import {
    DEFAULT_WEBSOCKET_OPTIONS,
    websocketOptionsSchema,
} from '../../src/connection/websocket-options.js';

describe('DEFAULT_WEBSOCKET_OPTIONS', () => {
    it('negotiates no subprotocol, caps a frame at 100 MiB and trusts the server', () => {
        expect(DEFAULT_WEBSOCKET_OPTIONS).toEqual({
            maximumMessageSizeKiB: 102_400,
            subprotocols: [],
            verifyCertificate: true,
        });
    });
});

describe('websocketOptionsSchema', () => {
    it('parses a full set of options', () => {
        expect(
            websocketOptionsSchema.parse({
                maximumMessageSizeKiB: 64,
                subprotocols: ['graphql-ws', 'wamp.2.json'],
                verifyCertificate: false,
                frame: '{"event": {{event}}, "data": {{payload}}}',
            }),
        ).toEqual({
            maximumMessageSizeKiB: 64,
            subprotocols: ['graphql-ws', 'wamp.2.json'],
            verifyCertificate: false,
            frame: '{"event": {{event}}, "data": {{payload}}}',
        });
    });

    it('refuses a frame template longer than a document could carry', () => {
        expect(websocketOptionsSchema.safeParse({ frame: 'x'.repeat(65_537) }).success).toBe(false);
    });

    it('refuses a size that could not hold one frame', () => {
        expect(websocketOptionsSchema.safeParse({ maximumMessageSizeKiB: 0 }).success).toBe(false);
    });

    it('refuses a subprotocol no server would negotiate', () => {
        expect(websocketOptionsSchema.safeParse({ subprotocols: ['graphql ws'] }).success).toBe(
            false,
        );
    });
});

describe('a connection that carries websocket options', () => {
    it('parses with the options it names', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'orders',
                name: 'Orders',
                transport: 'websocket',
                url: 'ws://localhost:3000',
                websocket: { subprotocols: ['graphql-ws'] },
            }).websocket,
        ).toEqual({ subprotocols: ['graphql-ws'] });
    });

    it('parses without any option present', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'orders',
                name: 'Orders',
                transport: 'websocket',
                url: 'ws://localhost:3000',
            }).websocket,
        ).toBeUndefined();
    });
});
