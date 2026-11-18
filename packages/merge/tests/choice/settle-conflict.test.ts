import { describe, expect, it } from 'vitest';

import { NO_DECISION, settleConflict, settleResult } from '../../src/choice/settle-conflict.js';
import type { Decide, MergeConflict } from '../../src/value/merge-conflict.js';

function conflict(
    shape: MergeConflict['shape'],
    extra: Partial<MergeConflict> = {},
): MergeConflict {
    return {
        id: 'a',
        path: ['a'],
        shape,
        base: { value: 'base' },
        ours: { value: 'mine' },
        theirs: { value: 'theirs' },
        ...extra,
    };
}

const PICK_THEIRS: Decide = () => ({ pick: 'theirs' });

describe('settling a conflict with what the user decided', () => {
    it('leaves the question open, with ours meanwhile, when nobody decided', () => {
        const asked = conflict('value');

        expect(settleConflict(asked, NO_DECISION)).toEqual({ value: 'mine', conflicts: [asked] });
    });

    it('answers with the side that was picked, and the question is gone', () => {
        expect(settleConflict(conflict('value'), PICK_THEIRS)).toEqual({
            value: 'theirs',
            conflicts: [],
        });
        expect(settleConflict(conflict('row'), () => ({ pick: 'ours' }))).toEqual({
            value: 'mine',
            conflicts: [],
        });
    });

    it('answers «not there» when the picked side is not there', () => {
        const deleted = conflict('row', { theirs: null });

        expect(settleConflict(deleted, PICK_THEIRS)).toEqual({ value: undefined, conflicts: [] });
    });

    it('takes the text the user wrote for a text and for a whole file', () => {
        const decide: Decide = () => ({ text: 'written' });

        expect(settleConflict(conflict('text', { proposed: 'p' }), decide).value).toBe('written');
        expect(settleConflict(conflict('file'), decide)).toEqual({
            value: 'written',
            conflicts: [],
        });
    });

    it('keeps the proposal of a text as the value while it is open', () => {
        const asked = conflict('text', { proposed: 'merged' });

        expect(settleConflict(asked, NO_DECISION)).toEqual({ value: 'merged', conflicts: [asked] });
    });

    it('does not take written text for a value or a row, which are picked, not written', () => {
        const decide: Decide = () => ({ text: 'written' });

        expect(settleConflict(conflict('value'), decide).conflicts).toHaveLength(1);
        expect(settleConflict(conflict('row'), decide).conflicts).toHaveLength(1);
    });

    it('settles the one question of a result, and leaves a result without questions alone', () => {
        const clean = { value: 1, conflicts: [] };
        const asked = { value: 'mine', conflicts: [conflict('value')] };

        expect(settleResult(clean, PICK_THEIRS)).toBe(clean);
        expect(settleResult(asked, PICK_THEIRS)).toEqual({ value: 'theirs', conflicts: [] });
    });
});
