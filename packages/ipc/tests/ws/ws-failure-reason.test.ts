import { describe, expect, it } from 'vitest';

import { WS_FAILURE_CODE } from '../../src/index.js';
import { wsFailureReasonSchema } from '../../src/ws/ws-failure-reason.js';

describe('why a socket could not open', () => {
    it('asks the same of the user for a name that does not resolve and a port nobody answers', () => {
        expect(WS_FAILURE_CODE.dns).toBe('ws-open-unreachable');
        expect(WS_FAILURE_CODE.refused).toBe('ws-open-unreachable');
    });

    it('keeps the general words for a failure nobody could name', () => {
        expect(WS_FAILURE_CODE.unknown).toBe('ws-open-failed');
    });

    it('gives every other reason words of its own', () => {
        const named = ['tls', 'timeout', 'rejected'] as const;

        expect(new Set(named.map((reason) => WS_FAILURE_CODE[reason])).size).toBe(named.length);
    });

    it('refuses a reason the transport never names', () => {
        expect(wsFailureReasonSchema.safeParse('sleepy').success).toBe(false);
    });
});
