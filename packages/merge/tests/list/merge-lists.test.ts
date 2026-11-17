import { describe, expect, it } from 'vitest';

import { NO_DECISION } from '../../src/choice/settle-conflict.js';
import { mergeLists } from '../../src/list/merge-lists.js';
import type { MergeStep } from '../../src/value/merge-conflict.js';
import { mergeValues } from '../../src/value/merge-values.js';

const THEIRS_WINS: MergeStep = (input) => ({ value: input.theirs, conflicts: [] });

describe('choosing how a list is merged', () => {
    it('hands each row to the step it was given, under the key of the row', () => {
        const seen: string[] = [];
        const step: MergeStep = (input) => {
            seen.push(input.path.join('/'));

            return THEIRS_WINS(input);
        };

        const input = {
            base: [],
            ours: [{ key: 'a' }],
            theirs: [{ key: 'b' }],
            path: ['q'],
            decide: NO_DECISION,
        };

        mergeLists(input, [{ key: 'a' }], [{ key: 'b' }], step);

        expect(seen).toEqual(['q/b#0', 'q/a#0']);
    });

    it('merges strings as a set without ever calling the step', () => {
        const input = {
            base: ['a'],
            ours: ['a', 'b'],
            theirs: ['c', 'a'],
            path: [],
            decide: NO_DECISION,
        };
        const step: MergeStep = () => {
            throw new Error('a set of strings has no rows to hand over');
        };

        expect(mergeLists(input, ['a', 'b'], ['c', 'a'], step)).toEqual({
            value: ['c', 'a', 'b'],
            conflicts: [],
        });
    });

    it('asks about the whole list when it is neither', () => {
        const input = { base: [1], ours: [2], theirs: [3], path: ['n'], decide: NO_DECISION };
        const result = mergeLists(input, [2], [3], THEIRS_WINS);

        expect(result.value).toEqual([2]);
        expect(result.conflicts[0]).toMatchObject({ id: 'n', shape: 'value' });
    });
});

describe('merging a list of objects', () => {
    it('finds the rows of variables by name', () => {
        const variable = (name: string, value: string): object => ({
            name,
            value,
            enabled: true,
            secret: false,
        });
        const result = mergeValues(
            { variables: [variable('host', 'a'), variable('token', 'b')] },
            { variables: [variable('host', 'a2'), variable('token', 'b')] },
            { variables: [variable('host', 'a'), variable('token', 'b2')] },
        );

        expect(result.conflicts).toEqual([]);
        expect(result.value).toEqual({
            variables: [variable('host', 'a2'), variable('token', 'b2')],
        });
    });

    it('asks about the whole list when its rows have no identity', () => {
        const result = mergeValues(
            { rows: [{ a: 1 }] },
            { rows: [{ a: 2 }] },
            { rows: [{ a: 3 }] },
        );

        expect(result.value).toEqual({ rows: [{ a: 2 }] });
        expect(result.conflicts[0]).toMatchObject({ id: 'rows', shape: 'value' });
    });
});

describe('merging a list of strings', () => {
    it('keeps the order of a folder without asking', () => {
        const result = mergeValues(
            { order: ['a', 'b', 'c'] },
            { order: ['c', 'a', 'b'] },
            { order: ['a', 'b', 'c', 'd'] },
        );

        expect(result).toEqual({ value: { order: ['c', 'd', 'a', 'b'] }, conflicts: [] });
    });

    it('asks about a list that mixes strings with other things', () => {
        const result = mergeValues({ list: [1] }, { list: ['a'] }, { list: [2] });

        expect(result.conflicts[0]).toMatchObject({ id: 'list', shape: 'value' });
    });

    it('treats a base that is no list as an empty one', () => {
        const result = mergeValues({ list: 'x' }, { list: ['a'] }, { list: ['b'] });

        expect(result.value).toEqual({ list: ['b', 'a'] });
    });
});
