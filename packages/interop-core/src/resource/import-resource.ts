import type { ItemOrigin } from '@mandor/schema';

import type { Degradation } from './degradation.js';
import type { ResourcePlace } from './resource-place.js';

/** One thing an import knows how to write, carried exactly as applying will write it. */
export type ImportResource = {
    place: ResourcePlace;
    /** The kind of collection item a `place: 'item'` resource writes. Null for every other place. */
    itemKind: string | null;
    /** The connection id, or the collection path without extension. Same identity rule as the workspace uses. */
    route: string;
    name: string;
    /** The whole file body, envelope included. Applying writes this verbatim; nobody re-derives it. */
    fields: Record<string, unknown>;
    /**
     * The same origin for every resource of one import, but the files of a workspace: each brings
     * its own. A mixed bag anywhere else means the split upstream broke.
     */
    origin: ItemOrigin;
    /**
     * What the import could not carry whole, one line each: a binding with no transport, a key the
     * envelope keeps loose. Empty means the resource entered whole.
     */
    degradations: Degradation[];
};
