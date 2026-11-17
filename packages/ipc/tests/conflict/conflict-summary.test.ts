import { describe, expect, it } from 'vitest';

import { conflictListResultSchema } from '../../src/index.js';
import { conflictSummarySchema } from '../../src/conflict/conflict-summary.js';

const ROW = {
    id: 'workspaces/pagos/collection/login.yaml',
    entity: { area: 'collections', workspaceId: 'pagos', path: 'login' },
    name: 'login',
    sections: ['headers'],
    source: 'merge',
    at: '2026-10-07T10:00:00.000Z',
};

describe('a clash as a row of a list (conflict-summary)', () => {
    it('round-trips a row with the entity it belongs to', () => {
        expect(conflictSummarySchema.parse(ROW)).toEqual(ROW);
    });

    it('accepts a clash of the whole file, with no section', () => {
        expect(conflictSummarySchema.safeParse({ ...ROW, sections: [] }).success).toBe(true);
    });

    it('refuses a source that no step of the app has', () => {
        expect(conflictSummarySchema.safeParse({ ...ROW, source: 'sync' }).success).toBe(false);
    });

    it('refuses a field it does not know, so a path of this machine cannot slip in', () => {
        expect(conflictSummarySchema.safeParse({ ...ROW, path: 'C:/repo/a.yaml' }).success).toBe(
            false,
        );
    });

    it('answers a list as a result', () => {
        expect(conflictListResultSchema.parse({ ok: true, value: [ROW] })).toEqual({
            ok: true,
            value: [ROW],
        });
    });
});
