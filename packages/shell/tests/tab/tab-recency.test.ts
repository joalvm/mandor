import type { GridLeaf } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { recencyOf, recentTabAt } from '../../src/tab/tab-recency.js';

const DOCS = 'mandor://demo/payments/doc';

function leaf(activeTab: string, ...ids: string[]): GridLeaf {
    return {
        activeTab,
        id: 'root',
        kind: 'leaf',
        tabs: ids.map((id) => ({ id, kind: 'doc', resource: `${DOCS}/${id}.md` })),
    };
}

describe('the order in which the tabs of a group were used', () => {
    it('puts the tab in front first and keeps the rest as they were used', () => {
        const recency = recencyOf({ root: ['b', 'a', 'c'] }, leaf('c', 'a', 'b', 'c'));

        expect(recency).toEqual({ root: ['c', 'b', 'a'] });
    });

    it('drops what left the group and puts what was never in front last, in strip order', () => {
        const recency = recencyOf({ root: ['gone', 'a'] }, leaf('a', 'a', 'x', 'y'));

        expect(recency).toEqual({ root: ['a', 'x', 'y'] });
    });

    it('forgets a group that is gone', () => {
        expect(recencyOf({ gone: ['a'] }, leaf('a', 'a'))).toEqual({ root: ['a'] });
    });
});

describe('walking the order of use', () => {
    it('goes round in both directions', () => {
        const order = ['c', 'b', 'a'];

        expect(recentTabAt(order, 1)).toBe('b');
        expect(recentTabAt(order, 3)).toBe('c');
        expect(recentTabAt(order, -1)).toBe('a');
        expect(recentTabAt([], 1)).toBeUndefined();
    });
});
