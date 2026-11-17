import { describe, expect, it } from 'vitest';

import { parseConnection } from '../../src/index.js';
import {
    DEFAULT_KEEPALIVE_OPTIONS,
    keepaliveOptionsSchema,
} from '../../src/connection/keepalive-options.js';

describe('DEFAULT_KEEPALIVE_OPTIONS', () => {
    it('stays off, and when on it pings every thirty seconds and waits ten for the pong', () => {
        expect(DEFAULT_KEEPALIVE_OPTIONS).toEqual({
            enabled: false,
            intervalMs: 30_000,
            pongTimeoutMs: 10_000,
        });
    });
});

describe('keepaliveOptionsSchema', () => {
    it('parses a full set of options', () => {
        expect(
            keepaliveOptionsSchema.parse({
                enabled: true,
                intervalMs: 5_000,
                pongTimeoutMs: 2_000,
            }),
        ).toEqual({ enabled: true, intervalMs: 5_000, pongTimeoutMs: 2_000 });
    });

    it('refuses an interval that would ping in the past', () => {
        expect(keepaliveOptionsSchema.safeParse({ intervalMs: -1 }).success).toBe(false);
    });
});

describe('a connection that carries keepalive options', () => {
    it('parses with the options it names', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'orders',
                keepalive: { enabled: true, intervalMs: 1_000, pongTimeoutMs: 500 },
                name: 'Orders',
                transport: 'websocket',
                url: 'ws://localhost:3000',
            }).keepalive,
        ).toEqual({ enabled: true, intervalMs: 1_000, pongTimeoutMs: 500 });
    });

    it('parses without options present', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'orders',
                name: 'Orders',
                transport: 'websocket',
                url: 'ws://localhost:3000',
            }).keepalive,
        ).toBeUndefined();
    });
});
