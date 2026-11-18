import type { ResourceUri } from '@mandor/schema';

import type { ActivityEntry } from './activity-entry.js';
import type { TimelineNarrowing } from './lib/timeline-narrowing.js';

/**
 * The timeline of each resource being looked at, indexed by the resource and never by the tab:
 * a tab moved between groups is the same resource, so what arrived through it stays. The
 * narrowing the head set lives beside it, under the same rule: it is view state of the resource.
 */
export type ActivitySlice = {
    entries: Record<ResourceUri, ActivityEntry[]>;
    narrowings: Record<ResourceUri, TimelineNarrowing>;
};

export function initialActivitySlice(): ActivitySlice {
    return { entries: {}, narrowings: {} };
}
