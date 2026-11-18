import { describe, expect, it } from 'vitest';

import { mergeValues } from '../../src/value/merge-values.js';

describe('merging three values', () => {
    it('answers the same value when both sides agree, whatever the base says', () => {
        expect(mergeValues({ a: 1 }, { a: 2 }, { a: 2 })).toEqual({
            value: { a: 2 },
            conflicts: [],
        });
    });

    it('takes theirs when only theirs moved, and ours when only ours moved', () => {
        expect(mergeValues('x', 'x', 'y')).toEqual({ value: 'y', conflicts: [] });
        expect(mergeValues('x', 'y', 'x')).toEqual({ value: 'y', conflicts: [] });
    });

    it('lets a deletion through when the other side did not touch the key', () => {
        expect(mergeValues({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 }).value).toEqual({ a: 1 });
        expect(mergeValues({ a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 }).value).toEqual({ a: 1 });
    });

    it('keeps a key both sides added with the same value', () => {
        expect(mergeValues({}, { a: 1 }, { a: 1 })).toEqual({ value: { a: 1 }, conflicts: [] });
    });

    it('joins the keys each side changed, in the order of ours with the new ones last', () => {
        const merged = mergeValues({ a: 1, b: 2 }, { b: 3, a: 1 }, { a: 1, b: 2, c: 4 });

        expect(merged.conflicts).toEqual([]);
        expect(Object.keys(merged.value as object)).toEqual(['b', 'a', 'c']);
        expect(merged.value).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('treats a base that is no object as an empty one', () => {
        expect(mergeValues('text', { a: 1 }, { b: 2 }).value).toEqual({ a: 1, b: 2 });
        expect(mergeValues(undefined, { a: 1 }, { a: 2 }).conflicts).toHaveLength(1);
    });

    it('does not let a key called like the prototype lend its value', () => {
        expect(mergeValues({}, { constructor: 1 }, { constructor: 1, x: 2 }).value).toEqual({
            constructor: 1,
            x: 2,
        });
    });

    it('asks about a scalar both sides changed, keeping ours meanwhile', () => {
        const merged = mergeValues({ method: 'GET' }, { method: 'PUT' }, { method: 'POST' });

        expect(merged.value).toEqual({ method: 'PUT' });
        expect(merged.conflicts).toEqual([
            {
                id: 'method',
                path: ['method'],
                shape: 'value',
                base: { value: 'GET' },
                ours: { value: 'PUT' },
                theirs: { value: 'POST' },
            },
        ]);
    });

    it('asks about a key deleted against a key changed, with «not there» for the deleter', () => {
        const mine = mergeValues({ a: 1 }, {}, { a: 2 });
        const theirs = mergeValues({ a: 1 }, { a: 2 }, {});

        expect(mine.value).toEqual({});
        expect(mine.conflicts[0]).toMatchObject({ ours: null, theirs: { value: 2 } });
        expect(theirs.value).toEqual({ a: 2 });
        expect(theirs.conflicts[0]).toMatchObject({ ours: { value: 2 }, theirs: null });
    });

    it('asks about a change of type, keeping ours', () => {
        const merged = mergeValues({ a: 1 }, { a: { b: 1 } }, { a: 'text' });

        expect(merged.value).toEqual({ a: { b: 1 } });
        expect(merged.conflicts[0]).toMatchObject({ id: 'a', shape: 'value' });
    });

    it('names a conflict by the whole path, starting from the one it was given', () => {
        const merged = mergeValues({ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }, ['root']);

        expect(merged.conflicts[0]).toMatchObject({ id: 'root/a/b', path: ['root', 'a', 'b'] });
    });

    it('answers the same conflicts every time it is asked', () => {
        const ask = (): unknown => mergeValues({ a: 1 }, { a: 2 }, { a: 3 }).conflicts;

        expect(ask()).toEqual(ask());
    });
});
