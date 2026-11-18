import { z } from 'zod';

import { sessionTabSchema, type SessionTab } from './session-tab.js';

/** How a branch lays its children out: `row` side by side, `column` one above the other. */
const GRID_AXES = ['row', 'column'] as const;

export type GridAxis = (typeof GRID_AXES)[number];

/**
 * A group: one strip of tabs with one of them showing. It can be empty, because the root of
 * the grid has nowhere to collapse to and stays behind when its last tab is closed.
 */
export type GridLeaf = {
    kind: 'leaf';
    id: string;
    tabs: SessionTab[];
    activeTab: string | null;
};

/** A split. `sizes` is the share of the axis each child takes, one number per child. */
export type GridBranch = {
    kind: 'branch';
    axis: GridAxis;
    sizes: number[];
    children: GridNode[];
};

export type GridNode = GridBranch | GridLeaf;

/** The tree is recursive, so the union is declared before the two shapes that make it up. */
export const gridNodeSchema: z.ZodType<GridNode> = z.lazy(() =>
    z.union([gridBranchSchema, gridLeafSchema]),
);

const gridLeafSchema = z
    .object({
        kind: z.literal('leaf'),
        id: z.string().trim().min(1),
        tabs: z.array(sessionTabSchema),
        activeTab: z.string().trim().min(1).nullable(),
    })
    .strict()
    .refine(showsOneOfItsOwnTabs, {
        error: 'The active tab must be one of the tabs of its group',
        path: ['activeTab'],
    });

const gridBranchSchema = z
    .object({
        kind: z.literal('branch'),
        axis: z.enum(GRID_AXES),
        sizes: z.array(z.number().positive()),
        children: z.array(gridNodeSchema).min(2),
    })
    .strict()
    .refine(hasOneSizePerChild, {
        error: 'A split needs one size per child',
        path: ['sizes'],
    });

function showsOneOfItsOwnTabs(leaf: GridLeaf): boolean {
    if (leaf.activeTab === null) {
        return true;
    }

    return leaf.tabs.some((tab) => tab.id === leaf.activeTab);
}

function hasOneSizePerChild(branch: GridBranch): boolean {
    return branch.sizes.length === branch.children.length;
}
