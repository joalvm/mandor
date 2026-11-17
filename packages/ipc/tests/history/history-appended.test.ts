import { describe, expect, it } from 'vitest';

import { historyAppendedPushSchema } from '../../src/index.js';

const push = {
    workspaceId: 'payments',
    summary: {
        id: '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11',
        sentAt: '2026-09-23T10:15:30.123Z',
        itemPath: 'orders/create',
        method: 'GET',
        url: 'http://localhost/orders',
        outcome: { kind: 'failure', code: 'request-refused' },
    },
    removed: [],
};

const OLDEST = '0b7d3c9a-1f2e-4a6b-8c4d-5e6f7a8b9c0d';

describe('the push of history:appended', () => {
    it('carries the workspace and the row of the send that was just written', () => {
        expect(historyAppendedPushSchema.parse(push)).toEqual(push);
    });

    it('carries the sends the limits of the history took out to make room for it', () => {
        const pruned = { ...push, removed: [OLDEST] };

        expect(historyAppendedPushSchema.parse(pruned)).toEqual(pruned);
    });

    it('refuses a removed send that is not named by its id', () => {
        expect(historyAppendedPushSchema.safeParse({ ...push, removed: ['../x'] }).success).toBe(
            false,
        );
    });

    it('refuses a push without a workspace', () => {
        expect(historyAppendedPushSchema.safeParse({ summary: push.summary }).success).toBe(false);
    });
});
