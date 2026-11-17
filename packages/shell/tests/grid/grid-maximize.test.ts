import type { GridNode } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { maximizedGrid } from '../../src/grid/grid-maximize.js';

const LEFT: GridNode = { activeTab: null, id: 'root', kind: 'leaf', tabs: [] };
const RIGHT: GridNode = { activeTab: null, id: 'group-2', kind: 'leaf', tabs: [] };
const GRID: GridNode = { axis: 'row', children: [LEFT, RIGHT], kind: 'branch', sizes: [50, 50] };

describe('drawing one group on its own', () => {
    it('draws the whole tree while no group is maximised', () => {
        expect(maximizedGrid(GRID, null)).toBe(GRID);
    });

    it('draws only the group that is maximised, leaving the tree untouched', () => {
        expect(maximizedGrid(GRID, 'group-2')).toBe(RIGHT);
        expect(GRID).toMatchObject({ children: [LEFT, RIGHT] });
    });

    it('draws the whole tree when the group maximised is gone', () => {
        expect(maximizedGrid(GRID, 'group-9')).toBe(GRID);
    });
});
