import { describe, expect, it } from 'vitest';

import {
    conflictChangedPushSchema,
    conflictReadRequestSchema,
    conflictReadResultSchema,
} from '../../src/index.js';
import { conflictItemSchema } from '../../src/conflict/conflict-detail.js';

const ITEM = {
    id: 'headers/Accept#0',
    path: ['headers', 'Accept#0'],
    shape: 'row',
    base: { value: { key: 'Accept', value: 'a' } },
    ours: { value: { key: 'Accept', value: 'b' } },
    theirs: null,
};

describe('a clash opened with its questions (conflict-detail)', () => {
    it('round-trips a question whose sides crossed as JSON, one of them missing', () => {
        expect(conflictItemSchema.parse(ITEM)).toEqual(ITEM);
    });

    it('keeps the text a merge by lines proposed', () => {
        const text = { ...ITEM, shape: 'text', proposed: 'one\ntwo\n' };

        expect(conflictItemSchema.parse(text)).toEqual(text);
    });

    it('refuses a side that is not JSON', () => {
        expect(conflictItemSchema.safeParse({ ...ITEM, ours: { value: () => 1 } }).success).toBe(
            false,
        );
    });

    it('is asked for by the id of its row, and nothing else', () => {
        expect(conflictReadRequestSchema.parse({ id: 'a' })).toEqual({ id: 'a' });
        expect(conflictReadRequestSchema.safeParse({ id: 'a', path: '/etc' }).success).toBe(false);
        expect(conflictReadRequestSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('answers with the clash and its questions', () => {
        const value = { id: 'a', entity: { area: 'repo' }, name: 'a', conflicts: [ITEM] };

        expect(conflictReadResultSchema.parse({ ok: true, value })).toEqual({ ok: true, value });
    });

    it('pushes an empty message when the list changed (conflict-changed)', () => {
        expect(conflictChangedPushSchema.parse({})).toEqual({});
        expect(conflictChangedPushSchema.safeParse({ id: 'a' }).success).toBe(false);
    });
});
