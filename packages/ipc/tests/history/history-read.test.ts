import { describe, expect, it } from 'vitest';

import { historyReadRequestSchema, historyReadResultSchema } from '../../src/index.js';

const ID = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

describe('the request of history:read', () => {
    it('names one send by the id of the window that made it', () => {
        const input = { workspaceId: 'payments', id: ID };

        expect(historyReadRequestSchema.parse(input)).toEqual(input);
    });

    it('refuses an id that is not a uuid', () => {
        expect(historyReadRequestSchema.safeParse({ workspaceId: 'p', id: '../x' }).success).toBe(
            false,
        );
    });
});

describe('the answer of history:read', () => {
    it('is a failure the interface can name by its code', () => {
        const answer = { ok: false, error: { code: 'fs-read', message: 'gone' } };

        expect(historyReadResultSchema.parse(answer)).toEqual(answer);
    });
});
