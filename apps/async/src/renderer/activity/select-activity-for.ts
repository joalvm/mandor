import type { ResourceUri } from '@mandor/schema';

import type { ActivityEntry } from './activity-entry.js';
import type { ActivityStore } from './activity-store.js';

/** One stable reference for every quiet resource: no batch elsewhere redraws its panel. */
const EMPTY_ACTIVITY: ActivityEntry[] = [];

export function selectActivityFor(
    resource: ResourceUri,
): (state: ActivityStore) => readonly ActivityEntry[] {
    return (state) => state.entries[resource] ?? EMPTY_ACTIVITY;
}
