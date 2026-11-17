import type { ResourceUri } from '@mandor/schema';

import type { ActivityStore } from './activity-store.js';
import { RESTING_NARROWING, type TimelineNarrowing } from './lib/timeline-narrowing.js';

/** The head's asking for one resource, at rest when the head never touched it. */
export function selectNarrowingFor(
    resource: ResourceUri,
): (state: ActivityStore) => TimelineNarrowing {
    return (state) => state.narrowings[resource] ?? RESTING_NARROWING;
}
