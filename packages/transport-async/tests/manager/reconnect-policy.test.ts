import { describe, expect, it } from 'vitest';

import {
    DEFAULT_RECONNECT_POLICY,
    endOpen,
    reconnectDelay,
} from '../../src/manager/reconnect-policy.js';

const policy = { baseMs: 100, ceilingMs: 450, maxAttempts: Number.POSITIVE_INFINITY, spread: 0 };

describe('reconnectDelay', () => {
    it('doubles the wait with each attempt', () => {
        expect(reconnectDelay(0, policy)).toBe(100);
        expect(reconnectDelay(1, policy)).toBe(200);
        expect(reconnectDelay(2, policy)).toBe(400);
    });

    it('never waits past the ceiling', () => {
        expect(reconnectDelay(3, policy)).toBe(450);
        expect(reconnectDelay(10, policy)).toBe(450);
    });
});

describe('reconnectDelay with spread', () => {
    const spreadPolicy = {
        baseMs: 100,
        ceilingMs: 1_000,
        maxAttempts: Number.POSITIVE_INFINITY,
        spread: 0.2,
    };

    it('waits the minimum when the generator returns 0', () => {
        expect(reconnectDelay(0, spreadPolicy, () => 0)).toBe(80);
    });

    it('waits the maximum when the generator returns 1', () => {
        expect(reconnectDelay(0, spreadPolicy, () => 1)).toBeCloseTo(120);
    });

    it('never strays outside the spread interval', () => {
        for (const random of [0, 0.25, 0.5, 0.75, 1]) {
            const delay = reconnectDelay(2, spreadPolicy, () => random);

            expect(delay).toBeGreaterThanOrEqual(320 - 1e-9);
            expect(delay).toBeLessThanOrEqual(480 + 1e-9);
        }
    });

    it('falls back to 0.2 when the policy says nothing about spread', () => {
        const silentPolicy = {
            baseMs: 100,
            ceilingMs: 1_000,
            maxAttempts: Number.POSITIVE_INFINITY,
        };

        expect(reconnectDelay(0, silentPolicy, () => 0)).toBe(80);
    });
});

describe('DEFAULT_RECONNECT_POLICY', () => {
    it('retries five times, from half a second up to eight, spread a fifth either way', () => {
        expect(DEFAULT_RECONNECT_POLICY).toEqual({
            baseMs: 500,
            ceilingMs: 8_000,
            maxAttempts: 5,
            spread: 0.2,
        });
    });
});

describe('endOpen', () => {
    it('starts the attempts again after a socket that stayed open a while', () => {
        const connection = { attempts: 3, openedAt: 1_000 };

        expect(endOpen(connection, 6_000)).toBe(true);
        expect(connection).toEqual({ attempts: 0, openedAt: undefined });
    });

    it('keeps counting after a socket the server hung up at once', () => {
        const connection = { attempts: 3, openedAt: 1_000 };

        expect(endOpen(connection, 5_999)).toBe(true);
        expect(connection).toEqual({ attempts: 3, openedAt: undefined });
    });

    it('calls an attempt that never opened no drop', () => {
        const connection = { attempts: 2, openedAt: undefined };

        expect(endOpen(connection, 9_000)).toBe(false);
        expect(connection.attempts).toBe(2);
    });
});
