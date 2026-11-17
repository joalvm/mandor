import { describe, expect, it } from 'vitest';

import { parseConnection } from '../../src/index.js';
import { DEFAULT_RETRY_OPTIONS, retryOptionsSchema } from '../../src/connection/retry-options.js';

describe('DEFAULT_RETRY_OPTIONS', () => {
    it('reconnects up to five times, waiting half a second the first time and eight at most', () => {
        expect(DEFAULT_RETRY_OPTIONS).toEqual({
            attempts: 5,
            enabled: true,
            initialWaitMs: 500,
            maximumWaitMs: 8_000,
            spread: 0.2,
        });
    });
});

describe('retryOptionsSchema', () => {
    it('parses a full policy', () => {
        expect(
            retryOptionsSchema.parse({
                attempts: 3,
                enabled: false,
                initialWaitMs: 250,
                maximumWaitMs: 4_000,
            }),
        ).toEqual({ attempts: 3, enabled: false, initialWaitMs: 250, maximumWaitMs: 4_000 });
    });

    it('refuses a wait of zero', () => {
        expect(retryOptionsSchema.safeParse({ initialWaitMs: 0 }).success).toBe(false);
    });

    it('accepts the extremes of the spread range', () => {
        expect(retryOptionsSchema.safeParse({ spread: 0 }).success).toBe(true);
        expect(retryOptionsSchema.safeParse({ spread: 1 }).success).toBe(true);
    });

    it('refuses a spread outside 0 to 1', () => {
        expect(retryOptionsSchema.safeParse({ spread: -0.1 }).success).toBe(false);
        expect(retryOptionsSchema.safeParse({ spread: 1.1 }).success).toBe(false);
    });

    it('refuses a maximum wait below the first one', () => {
        expect(
            retryOptionsSchema.safeParse({
                attempts: 5,
                enabled: true,
                initialWaitMs: 8_000,
                maximumWaitMs: 500,
            }).success,
        ).toBe(false);
    });
});

describe('a connection that carries a retry policy', () => {
    it('parses with the policy it names', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'orders',
                name: 'Orders',
                retry: { attempts: 2, enabled: false, initialWaitMs: 100, maximumWaitMs: 200 },
                transport: 'websocket',
                url: 'ws://localhost:3000',
            }).retry,
        ).toEqual({ attempts: 2, enabled: false, initialWaitMs: 100, maximumWaitMs: 200 });
    });

    it('parses without a policy present', () => {
        expect(
            parseConnection({
                environmentId: null,
                headers: [],
                id: 'orders',
                name: 'Orders',
                transport: 'websocket',
                url: 'ws://localhost:3000',
            }).retry,
        ).toBeUndefined();
    });
});
