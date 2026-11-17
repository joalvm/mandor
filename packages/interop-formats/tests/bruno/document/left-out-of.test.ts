import { describe, expect, it } from 'vitest';

import { leftOutOf } from '../../../src/bruno/document/left-out-of.js';

describe('leftOutOf', () => {
    it('names the parts that hold something, in the order they were given', () => {
        expect(
            leftOutOf({
                scripts: [{ code: 'x' }],
                tags: ['smoke'],
                actions: { set: 1 },
                notes: ' a ',
                flag: true,
            }),
        ).toEqual(['scripts', 'tags', 'actions', 'notes', 'flag']);
    });

    it.each([
        ['an empty list', []],
        ['an empty record', {}],
        ['a blank text', '  '],
        ['false', false],
        ['nothing', undefined],
        ['null', null],
        ['a number', 0],
    ])('does not name a part that is %s', (_name, value) => {
        expect(leftOutOf({ part: value })).toEqual([]);
    });
});
