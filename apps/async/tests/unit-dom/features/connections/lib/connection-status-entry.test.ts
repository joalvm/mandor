import { describe, expect, it } from 'vitest';

import { connectionStatusEntry } from '../../../../../src/renderer/features/connections/lib/connection-status-entry.js';

describe('the timeline entry a change of state writes', () => {
    it('writes the socket coming up when it reaches open', () => {
        expect(connectionStatusEntry('connecting', 'open', 1_000)).toEqual({
            at: 1_000,
            bytes: 0,
            detail: { status: 'connected' },
            kind: 'connection-status',
        });
    });

    it('writes the socket going down when it closes from up', () => {
        expect(connectionStatusEntry('open', 'closed', 1_000)?.detail).toEqual({
            status: 'disconnected',
        });
        expect(connectionStatusEntry('closing', 'closed', 1_000)?.detail).toEqual({
            status: 'disconnected',
        });
    });

    /** A socket that failed on the way never came up: the fault says what happened, once. */
    it('writes nothing when a socket that never came up closes', () => {
        expect(connectionStatusEntry('error', 'closed')).toBeUndefined();
        expect(connectionStatusEntry('connecting', 'closed')).toBeUndefined();
    });

    it('writes nothing for the steps on the way', () => {
        expect(connectionStatusEntry('idle', 'connecting')).toBeUndefined();
        expect(connectionStatusEntry('open', 'closing')).toBeUndefined();
    });

    it('stamps now when no moment is given', () => {
        const before = Date.now();
        const entry = connectionStatusEntry('connecting', 'open');
        const after = Date.now();

        expect(entry?.at).toBeGreaterThanOrEqual(before);
        expect(entry?.at).toBeLessThanOrEqual(after);
    });
});
