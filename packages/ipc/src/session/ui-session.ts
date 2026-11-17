import { z } from 'zod';

import { gridNodeSchema } from './grid-node.js';
import { checkLayout } from './session-invariants.js';
import { CONTENT_SPLIT, panelsSchema, SIDEBAR_WIDTH } from './session-panels.js';

/** The group a window always has. Every other group can collapse; this one empties instead. */
export const ROOT_GROUP_ID = 'root';

/**
 * The arrangement of one window over one repo. It is UI, not work: it lives in `.mandor/`,
 * never in git, and restoring it recreates tabs and nothing that was running behind them.
 *
 * What a tab holds beyond its place in the arrangement — the draft a composer was left with —
 * travels as `tabState`, keyed by tab id. The window carries the bag and decides nothing about
 * what is inside: the app that wrote a key is the one that reads it back.
 *
 * `sections` is keyed by resource, not by tab: two tabs on one item show the same section.
 */
export const uiSessionSchema = z
    .object({
        version: z.literal(2),
        activeWorkspaceId: z.string().trim().min(1).nullable(),
        activeGroupId: z.string().trim().min(1),
        grid: gridNodeSchema,
        panels: panelsSchema,
        tabState: z.record(z.string(), z.unknown()).optional(),
        /** The inner section each open resource was left on — `body`, `params`, `schema`… */
        sections: z.record(z.string(), z.string()).optional(),
    })
    .strict()
    .superRefine(checkLayout);

export type UiSession = z.infer<typeof uiSessionSchema>;

export const EMPTY_UI_SESSION: UiSession = {
    version: 2,
    activeWorkspaceId: null,
    activeGroupId: ROOT_GROUP_ID,
    grid: { kind: 'leaf', id: ROOT_GROUP_ID, tabs: [], activeTab: null },
    panels: {
        sidebarWidth: SIDEBAR_WIDTH.default,
        contentSplit: CONTENT_SPLIT.default,
        collapsedSections: [],
        splits: {},
    },
};
