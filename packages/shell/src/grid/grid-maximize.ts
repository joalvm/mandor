import type { GridNode } from '@mandor/ipc';

import { leafOf } from './grid-leaf.js';

/**
 * The tree as it is drawn while one group is shown on its own: that group, and nothing else.
 *
 * The tree itself is left alone, so putting the window back is drawing it again. Nothing about
 * the arrangement is lost meanwhile, because nothing about it was touched.
 */
export function maximizedGrid(grid: GridNode, groupId: string | null): GridNode {
    if (groupId === null) {
        return grid;
    }

    return leafOf(grid, groupId) ?? grid;
}
