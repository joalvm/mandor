import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { resizedGrid, sashesOf } from '../../src/grid/grid-sashes.js';

function leaf(id: string): GridNode {
    return { kind: 'leaf', id, tabs: [], activeTab: null };
}

function branch(axis: 'row' | 'column', sizes: number[], children: GridNode[]): GridNode {
    return { kind: 'branch', axis, sizes, children };
}

const NESTED = branch(
    'row',
    [50, 50],
    [branch('column', [50, 50], [leaf('root'), leaf('group-2')]), leaf('group-3')],
);

describe('finding the separators of a grid', () => {
    it('finds none in a window with a single group', () => {
        expect(sashesOf(leaf('root'))).toEqual([]);
    });

    it('finds one fewer separator than the branch has children', () => {
        const grid = branch('row', [40, 30, 30], [leaf('root'), leaf('group-2'), leaf('group-3')]);

        expect(sashesOf(grid)).toEqual([
            { path: [], index: 0, axis: 'row', sizes: [40, 30, 30] },
            { path: [], index: 1, axis: 'row', sizes: [40, 30, 30] },
        ]);
    });

    it('lists the separator of a branch before those of the branches under it', () => {
        expect(sashesOf(NESTED)).toEqual([
            { path: [], index: 0, axis: 'row', sizes: [50, 50] },
            { path: [0], index: 0, axis: 'column', sizes: [50, 50] },
        ]);
    });
});

describe('moving a separator', () => {
    it('takes from the neighbour what it gives to the child before it', () => {
        const grid = branch('row', [50, 50], [leaf('root'), leaf('group-2')]);

        expect(resizedGrid(grid, [], 0, 10)).toEqual(
            branch('row', [60, 40], [leaf('root'), leaf('group-2')]),
        );
    });

    it('moves the separator of a nested branch and leaves the rest alone', () => {
        expect(resizedGrid(NESTED, [0], 0, -20)).toEqual(
            branch(
                'row',
                [50, 50],
                [branch('column', [30, 70], [leaf('root'), leaf('group-2')]), leaf('group-3')],
            ),
        );
    });

    it('refuses to shrink a group past the share that keeps it visible', () => {
        const grid = branch('row', [50, 50], [leaf('root'), leaf('group-2')]);

        expect(resizedGrid(grid, [], 0, 90)).toEqual(
            branch('row', [95, 5], [leaf('root'), leaf('group-2')]),
        );
    });

    it('refuses to grow a group past what its neighbour can give', () => {
        const grid = branch('row', [50, 50], [leaf('root'), leaf('group-2')]);

        expect(resizedGrid(grid, [], 0, -90)).toEqual(
            branch('row', [5, 95], [leaf('root'), leaf('group-2')]),
        );
    });

    it('answers the same grid when the path names no branch', () => {
        expect(resizedGrid(leaf('root'), [], 0, 10)).toEqual(leaf('root'));
    });
});
