import { describe, expect, it } from 'vitest';

import { connectionFaultEntry } from '../../../../../src/renderer/features/connections/lib/connection-fault-entry.js';

describe('the timeline entry a retry writes', () => {
    it('carries the code of why its attempt could not open, and the moment', () => {
        const entry = connectionFaultEntry('tls', 1_000);

        expect(entry).toEqual({
            at: 1_000,
            bytes: 0,
            detail: { at: 1_000, code: 'ws-open-tls' },
            kind: 'connection-fault',
        });
    });

    /** The first retry follows a socket that was open: nothing failed to open, the line went. */
    it('names the drop of a live socket apart from a failure to open', () => {
        expect(connectionFaultEntry(undefined, 1_000).detail).toEqual({
            at: 1_000,
            code: 'ws-connection-lost',
        });
    });

    it('stamps now when no moment is given', () => {
        const before = Date.now();
        const entry = connectionFaultEntry('refused');
        const after = Date.now();

        expect(entry.at).toBeGreaterThanOrEqual(before);
        expect(entry.at).toBeLessThanOrEqual(after);
    });
});
