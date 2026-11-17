import { describe, expect, it } from 'vitest';

import { originStatePushSchema, originStateSchema } from '../../src/origin/origin-state.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('origin:state', () => {
    it('answers the state of the open origin, or nothing when none is open', () => {
        expect(originStateSchema.parse(null)).toBeNull();
        expect(originStateSchema.parse({ state: 'clean', busy: false })).toEqual({
            state: 'clean',
            busy: false,
        });
    });

    it('refuses a state that is not one of the seven', () => {
        expect(originStateSchema.safeParse({ state: 'syncing', busy: true }).success).toBe(false);
    });
});

describe('origin:state-changed push', () => {
    it('carries the state and whether a step is running, and nothing else', () => {
        expect(originStatePushSchema.parse({ state: 'error', busy: false })).toEqual({
            state: 'error',
            busy: false,
        });
        expect(
            originStatePushSchema.safeParse({ state: 'error', busy: false, why: 'x' }).success,
        ).toBe(false);
    });

    it('is delivered by the double and stops at the unsubscribe', () => {
        const bridge = createFakeBridge();
        const heard: unknown[] = [];
        const stop = bridge.origin.onStateChanged((push) => heard.push(push));

        bridge.emitOriginState({ state: 'clean', busy: true });
        stop();
        bridge.emitOriginState({ state: 'clean', busy: false });

        expect(heard).toEqual([{ state: 'clean', busy: true }]);
    });
});
