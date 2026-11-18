import { describe, expect, it } from 'vitest';

import { conflictKeepMineRequestSchema, conflictResolveRequestSchema } from '../../src/index.js';
import { conflictChoiceSchema } from '../../src/conflict/conflict-resolve.js';

describe('closing a clash (conflict-resolve)', () => {
    it('takes a side or a text for a question, and nothing else', () => {
        expect(conflictChoiceSchema.parse({ pick: 'theirs' })).toEqual({ pick: 'theirs' });
        expect(conflictChoiceSchema.parse({ text: '' })).toEqual({ text: '' });
        expect(conflictChoiceSchema.safeParse({ pick: 'base' }).success).toBe(false);
        expect(conflictChoiceSchema.safeParse({ pick: 'ours', text: 'a' }).success).toBe(false);
    });

    it('is resolved with the id of the clash and an answer keyed by the id of each question', () => {
        const request = {
            id: 'abc',
            choices: { 'headers/Accept#1': { pick: 'ours' }, 'body/content': { text: '{}' } },
        };

        expect(conflictResolveRequestSchema.parse(request)).toEqual(request);
        expect(conflictResolveRequestSchema.safeParse({ ...request, path: '/etc' }).success).toBe(
            false,
        );
        expect(conflictResolveRequestSchema.safeParse({ id: '', choices: {} }).success).toBe(false);
    });

    it('keeps this copy by the id of the clash alone', () => {
        expect(conflictKeepMineRequestSchema.parse({ id: 'abc' })).toEqual({ id: 'abc' });
        expect(conflictKeepMineRequestSchema.safeParse({ id: 'abc', choices: {} }).success).toBe(
            false,
        );
    });
});
