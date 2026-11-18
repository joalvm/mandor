import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { splitLeaf } from '../../src/grid/grid-split.js';

function leaf(id: string): GridNode {
    return { activeTab: null, id, kind: 'leaf', tabs: [] };
}

describe('splitting a group', () => {
    it('keeps the group and puts an empty neighbour beside it, sharing the space evenly', () => {
        const root = leaf('root');

        expect(splitLeaf(root, 'root', 'row', 'group-2')).toEqual({
            axis: 'row',
            children: [root, leaf('group-2')],
            kind: 'branch',
            sizes: [50, 50],
        });
    });

    it('splits along the axis it was asked for', () => {
        expect(splitLeaf(leaf('root'), 'root', 'column', 'group-2')).toMatchObject({
            axis: 'column',
        });
    });

    it('splits a group nested in the tree and leaves the rest as it was', () => {
        const left = leaf('root');
        const grid: GridNode = {
            axis: 'row',
            children: [left, leaf('group-2')],
            kind: 'branch',
            sizes: [30, 70],
        };
        const next = splitLeaf(grid, 'group-2', 'column', 'group-3');

        expect(next).toMatchObject({ axis: 'row', sizes: [30, 70] });
        expect(next.kind === 'branch' ? next.children[0] : null).toBe(left);
        expect(next.kind === 'branch' ? next.children[1] : null).toMatchObject({
            axis: 'column',
            kind: 'branch',
        });
    });

    it('changes nothing for a group the grid does not hold', () => {
        const root = leaf('root');

        expect(splitLeaf(root, 'nowhere', 'row', 'group-2')).toBe(root);
    });
});
