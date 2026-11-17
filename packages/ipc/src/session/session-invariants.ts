import type { z } from 'zod';

import { leavesOf } from './grid-leaves.js';
import type { GridNode } from './grid-node.js';

type Layout = { grid: GridNode; activeGroupId: string };

/**
 * What a single node cannot check on its own: names have to be unique across the whole grid,
 * and the focused group has to be one that exists. A session breaking either would restore
 * into a window where two tabs answer to one id, or where the keyboard focuses nothing.
 */
export function checkLayout(layout: Layout, context: z.RefinementCtx): void {
    const leaves = leavesOf(layout.grid);
    const tabIds = leaves.flatMap((leaf) => leaf.tabs.map((tab) => tab.id));

    reportRepeats(
        leaves.map((leaf) => leaf.id),
        'Group ids must be unique',
        context,
    );
    reportRepeats(tabIds, 'Tab ids must be unique', context);

    if (!leaves.some((leaf) => leaf.id === layout.activeGroupId)) {
        context.addIssue({
            code: 'custom',
            message: 'The active group must be one of the groups of the grid',
            path: ['activeGroupId'],
        });
    }
}

function reportRepeats(ids: readonly string[], message: string, context: z.RefinementCtx): void {
    if (new Set(ids).size !== ids.length) {
        context.addIssue({ code: 'custom', message, path: ['grid'] });
    }
}
