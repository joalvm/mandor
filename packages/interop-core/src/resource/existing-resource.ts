import type { ItemOrigin } from '@mandor/schema';

import type { ResourcePlace } from './resource-place.js';

/** What the workspace holds today, as a plan needs to see it: where it is, what it is called, who wrote it. */
export type ExistingResource = {
    place: ResourcePlace;
    /**
     * The connection id, or the collection path without extension. Identity inside the workspace, and
     * the only thing a plan compares: two resources are the same one when this matches.
     */
    route: string;
    name: string;
    /** Absent means a person wrote it, and that is exactly what turns an import into a conflict. */
    origin?: ItemOrigin | undefined;
    /**
     * The fingerprint of what the item reads now, next to the fingerprint the import stored when
     * it wrote it. The two disagreeing is what says a person edited the item after the import,
     * and it is why an update can start out of the import instead of over somebody's work.
     */
    fingerprint?: string | undefined;
};
