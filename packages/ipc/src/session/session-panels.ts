import { z } from 'zod';

/**
 * The sidebar is measured in pixels, not in a share of the window. A percentage would widen
 * the tree every time the window grows, and a list of names does not need the extra room.
 */
export const SIDEBAR_WIDTH = { min: 200, default: 260, max: 420 } as const;

export const CONTENT_SPLIT = { min: 30, default: 50, max: 70 } as const;

/**
 * The sections of the lateral were once resized by hand, and a session of then still says how.
 * Nothing reads that any more, so it is dropped before the panels are read instead of failing
 * them: losing a drag costs nothing, losing the session costs the tabs that were open.
 */
function withoutSectionWeights(panels: unknown): unknown {
    if (typeof panels !== 'object' || panels === null) {
        return panels;
    }

    return Object.fromEntries(Object.entries(panels).filter(([key]) => key !== 'sectionWeights'));
}

/**
 * Sizes the user set with a drag. A stored value that no longer fits the range falls back to
 * the default instead of failing: losing a drag costs a second, losing the session costs the
 * tabs that were open.
 */
export const panelsSchema = z.preprocess(
    withoutSectionWeights,
    z
        .object({
            sidebarWidth: z
                .number()
                .min(SIDEBAR_WIDTH.min)
                .max(SIDEBAR_WIDTH.max)
                .catch(SIDEBAR_WIDTH.default),
            contentSplit: z
                .number()
                .min(CONTENT_SPLIT.min)
                .max(CONTENT_SPLIT.max)
                .catch(CONTENT_SPLIT.default),
            /**
             * Which sections of the sidebar the user folded. Ids of sections nobody registers any
             * more are kept: a feature that comes back should find its section as it was left.
             */
            collapsedSections: z.array(z.string().trim().min(1)).catch([]),
            /** Where the reader left the line of each split, by workspace and kind of surface. */
            splits: z.record(z.string(), z.number().min(0).max(100)).catch({}),
        })
        .strict(),
);
