import { describe, expect, it } from 'vitest';

import { SyncSendError } from '../../src/send/sync-send-error.js';
import type { SyncSendReason } from '../../src/send/sync-send-reason.js';

describe('SyncSendError', () => {
    it('accepts every reason of the closed list', () => {
        const reasons: SyncSendReason[] = [
            'scheme',
            'dns',
            'refused',
            'timeout-connect',
            'timeout-total',
            'aborted',
            'tls',
            'redirect-scheme',
            'redirect-limit',
            'unreachable',
            'closed',
            'invalid',
            'unknown',
        ];

        for (const reason of reasons) {
            expect(new SyncSendError(reason).reason).toBe(reason);
        }
    });

    it('carries its reason and names itself', () => {
        const error = new SyncSendError('refused');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('SyncSendError');
        expect(error.reason).toBe('refused');
        expect(error.message).toContain('refused');
    });

    it('carries a message of its own when one is given', () => {
        const error = new SyncSendError('tls', 'certificate rejected');

        expect(error.message).toBe('certificate rejected');
    });
});
