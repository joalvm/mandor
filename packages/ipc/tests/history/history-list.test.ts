import { describe, expect, it } from 'vitest';

import { historyListRequestSchema, historyListResultSchema } from '../../src/index.js';

const ID = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

const summary = {
    id: ID,
    sentAt: '2026-09-23T10:15:30.123Z',
    itemPath: 'orders/create',
    method: 'POST',
    url: 'http://localhost/orders',
    outcome: { kind: 'response', status: 201, totalMs: 12, bodyBytes: 40, graphqlErrors: 0 },
};

describe('the request of history:list', () => {
    it('asks for the whole history of a workspace', () => {
        expect(historyListRequestSchema.parse({ workspaceId: 'payments' })).toEqual({
            workspaceId: 'payments',
        });
    });

    it('can ask for the sends of one request only', () => {
        const input = { workspaceId: 'payments', itemPath: 'orders/create' };

        expect(historyListRequestSchema.parse(input)).toEqual(input);
    });

    it('refuses an item path that climbs out of the collection', () => {
        const input = { workspaceId: 'payments', itemPath: '../x' };

        expect(historyListRequestSchema.safeParse(input).success).toBe(false);
    });

    it('refuses a workspace that is not an id segment', () => {
        expect(historyListRequestSchema.safeParse({ workspaceId: '../x' }).success).toBe(false);
    });
});

describe('the answer of history:list', () => {
    it('carries summaries and never a body', () => {
        const answer = { ok: true, value: { entries: [summary] } };

        expect(historyListResultSchema.parse(answer)).toEqual(answer);
    });
});
