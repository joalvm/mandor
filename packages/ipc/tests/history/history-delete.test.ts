import { describe, expect, it } from 'vitest';

import { historyDeleteRequestSchema } from '../../src/index.js';

const ID = '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11';

describe('the request of history:delete', () => {
    it('deletes the sends it names', () => {
        const input = { workspaceId: 'payments', ids: [ID] };

        expect(historyDeleteRequestSchema.parse(input)).toEqual(input);
    });

    it('empties the history of a workspace when it says so', () => {
        const input = { workspaceId: 'payments', all: true };

        expect(historyDeleteRequestSchema.parse(input)).toEqual(input);
    });

    it('refuses to delete nothing', () => {
        expect(
            historyDeleteRequestSchema.safeParse({ workspaceId: 'payments', ids: [] }).success,
        ).toBe(false);
    });

    it('refuses an id that is not a uuid', () => {
        expect(
            historyDeleteRequestSchema.safeParse({ workspaceId: 'payments', ids: ['../x'] })
                .success,
        ).toBe(false);
    });

    it('refuses `all: false`, which says nothing', () => {
        expect(
            historyDeleteRequestSchema.safeParse({ workspaceId: 'payments', all: false }).success,
        ).toBe(false);
    });

    it('refuses both ways at once', () => {
        expect(
            historyDeleteRequestSchema.safeParse({ workspaceId: 'p', ids: [ID], all: true })
                .success,
        ).toBe(false);
    });
});
