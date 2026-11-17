import type { ImportPlanEntry } from '@mandor/interop-core';

const COLLECTION_ORIGIN = { kind: 'postman', sourceId: 'collections:1' } as const;

/** An `add` entry for a collection, carrying the given fields as the mapper would. */
export function collectionEntry(
    route: string,
    name: string,
    fields: Record<string, unknown> = {},
): ImportPlanEntry {
    return {
        class: 'add',
        place: 'collection',
        route,
        name,
        selected: true,
        resource: {
            place: 'collection',
            itemKind: null,
            route,
            name,
            fields: { name, ...fields },
            origin: COLLECTION_ORIGIN,
            degradations: [],
        },
    };
}
