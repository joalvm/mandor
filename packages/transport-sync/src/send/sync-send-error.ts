import type { SyncSendReason } from './sync-send-reason.js';

/**
 * A request that ended without a response. Carries the reason from the closed list so the
 * caller can name it to the user instead of paraphrasing an undici or system error.
 */
export class SyncSendError extends Error {
    constructor(
        readonly reason: SyncSendReason,
        message?: string,
    ) {
        super(message ?? `request failed: ${reason}`);
        this.name = 'SyncSendError';
    }
}
