import { describe, expect, it } from 'vitest';

import { ORIGIN_SYNC_STATES, originSyncStateSchema } from '../../src/index.js';

describe('origin-sync-state: originSyncStateSchema', () => {
    it.each(ORIGIN_SYNC_STATES)('accepts %s, busy or not', (state) => {
        expect(originSyncStateSchema.parse({ state, busy: true })).toEqual({ state, busy: true });
        expect(originSyncStateSchema.parse({ state, busy: false })).toEqual({ state, busy: false });
    });

    it('rejects a state it does not name', () => {
        expect(() => originSyncStateSchema.parse({ state: 'syncing', busy: false })).toThrow();
    });

    it('rejects a state without its busy flag, and a field it does not know', () => {
        expect(() => originSyncStateSchema.parse({ state: 'clean' })).toThrow();
        expect(() =>
            originSyncStateSchema.parse({ state: 'clean', busy: false, reason: 'x' }),
        ).toThrow();
    });
});
