import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { flattenedGrid } from '../../src/grid/grid-flatten.js';

function leaf(id: string): GridNode {
    return { kind: 'leaf', id, tabs: [], activeTab: null };
}

function branch(axis: 'row' | 'column', sizes: number[], children: GridNode[]): GridNode {
    return { kind: 'branch', axis, sizes, children };
}

describe('flattening a grid for a view that alternates axes by depth', () => {
    it('leaves a single group alone', () => {
        expect(flattenedGrid(leaf('root'))).toEqual(leaf('root'));
    });

    it('leaves a branch whose children alternate alone', () => {
        const grid = branch(
            'row',
            [50, 50],
            [leaf('a'), branch('column', [50, 50], [leaf('b'), leaf('c')])],
        );

        expect(flattenedGrid(grid)).toEqual(grid);
    });

    it('absorbs a child branch that repeats the axis of its parent', () => {
        const grid = branch(
            'row',
            [50, 50],
            [leaf('a'), branch('row', [50, 50], [leaf('b'), leaf('c')])],
        );

        expect(flattenedGrid(grid)).toEqual(
            branch('row', [50, 25, 25], [leaf('a'), leaf('b'), leaf('c')]),
        );
    });

    it('shares the absorbed size in the proportion the child had', () => {
        const grid = branch(
            'row',
            [40, 60],
            [leaf('a'), branch('row', [25, 75], [leaf('b'), leaf('c')])],
        );

        expect(flattenedGrid(grid)).toEqual(
            branch('row', [40, 15, 45], [leaf('a'), leaf('b'), leaf('c')]),
        );
    });

    it('absorbs down every level, not only the first', () => {
        const grid = branch(
            'row',
            [50, 50],
            [
                leaf('a'),
                branch(
                    'row',
                    [50, 50],
                    [leaf('b'), branch('row', [50, 50], [leaf('c'), leaf('d')])],
                ),
            ],
        );

        expect(flattenedGrid(grid)).toEqual(
            branch('row', [50, 25, 12.5, 12.5], [leaf('a'), leaf('b'), leaf('c'), leaf('d')]),
        );
    });

    it('keeps flattening under a branch that changes axis', () => {
        const grid = branch(
            'row',
            [50, 50],
            [
                leaf('a'),
                branch(
                    'column',
                    [50, 50],
                    [leaf('b'), branch('column', [50, 50], [leaf('c'), leaf('d')])],
                ),
            ],
        );

        expect(flattenedGrid(grid)).toEqual(
            branch(
                'row',
                [50, 50],
                [leaf('a'), branch('column', [50, 25, 25], [leaf('b'), leaf('c'), leaf('d')])],
            ),
        );
    });
});
