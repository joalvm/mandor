import type { ResourcePlace } from './resource-place.js';

/** What applying answered about one planned resource: it names it, and it says whether the write held. */
export type AppliedResource = {
    place: ResourcePlace;
    route: string;
    /** False means the write did not land, and the entry is not counted among the ones that did. */
    ok: boolean;
    /** Why the write did not land. Present only when `ok` is false; a held write says why it was held. */
    reason?: string | undefined;
};
