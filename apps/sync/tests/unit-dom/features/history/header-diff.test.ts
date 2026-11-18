import { describe, expect, it } from 'vitest';

import { headerDiff } from '../../../../src/renderer/features/history/lib/header-diff.js';

describe('comparing the headers of two responses', () => {
    it('says a header that only the second has was added', () => {
        expect(headerDiff([], [['x-new', '1']])).toEqual([
            { after: ['1'], before: [], change: 'added', name: 'x-new' },
        ]);
    });

    it('says a header that only the first has was removed', () => {
        expect(headerDiff([['x-old', '1']], [])).toEqual([
            { after: [], before: ['1'], change: 'removed', name: 'x-old' },
        ]);
    });

    it('says a header whose value moved changed, with both values', () => {
        expect(headerDiff([['etag', 'a']], [['etag', 'b']])).toEqual([
            { after: ['b'], before: ['a'], change: 'changed', name: 'etag' },
        ]);
    });

    it('says a header that stayed the same', () => {
        expect(headerDiff([['etag', 'a']], [['etag', 'a']])[0]?.change).toBe('same');
    });

    it('does not tell Content-Type from content-type', () => {
        const [row, ...rest] = headerDiff([['Content-Type', 'a']], [['content-type', 'a']]);

        expect(rest).toEqual([]);
        expect(row).toEqual({ after: ['a'], before: ['a'], change: 'same', name: 'Content-Type' });
    });

    it('compares a repeated header as an ordered list', () => {
        const same = headerDiff(
            [
                ['set-cookie', 'a=1'],
                ['set-cookie', 'b=2'],
            ],
            [
                ['set-cookie', 'a=1'],
                ['set-cookie', 'b=2'],
            ],
        );
        const reordered = headerDiff(
            [
                ['set-cookie', 'a=1'],
                ['set-cookie', 'b=2'],
            ],
            [
                ['set-cookie', 'b=2'],
                ['set-cookie', 'a=1'],
            ],
        );

        expect(same).toEqual([
            { after: ['a=1', 'b=2'], before: ['a=1', 'b=2'], change: 'same', name: 'set-cookie' },
        ]);
        expect(reordered[0]?.change).toBe('changed');
    });

    it('lists the headers of the first in its order, then those only the second has', () => {
        const names = headerDiff(
            [
                ['b', '1'],
                ['a', '1'],
            ],
            [
                ['c', '1'],
                ['a', '1'],
            ],
        ).map((row) => [row.name, row.change]);

        expect(names).toEqual([
            ['b', 'removed'],
            ['a', 'same'],
            ['c', 'added'],
        ]);
    });

    it('is nothing for two responses with no headers', () => {
        expect(headerDiff([], [])).toEqual([]);
    });
});
