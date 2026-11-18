import type { ImportResource } from './import-resource.js';
import type { ResourcePlace } from './resource-place.js';

/** The kinds of resource whose place in an app depends on what the app is for. */
export const STORABLE_KINDS = ['connection', 'message', 'request'] as const;

export type StorableKind = (typeof STORABLE_KINDS)[number];

function nothing(): null {
    return null;
}

/** What each place calls the thing it holds; the structure around the leaves names none. */
const NAMED_BY_PLACE: Record<ResourcePlace, (itemKind: string | null) => string | null> = {
    collection: nothing,
    connection: () => 'connection',
    doc: nothing,
    environment: nothing,
    folder: nothing,
    globals: nothing,
    item: (itemKind) => itemKind,
    workspace: nothing,
};

/**
 * Which kind of leaf a resource is, or null for the structure around the leaves (collections,
 * folders, environments, notes, the workspace), which every app keeps whatever it is for.
 */
export function storableKindOf({
    place,
    itemKind,
}: Pick<ImportResource, 'place' | 'itemKind'>): StorableKind | null {
    const named = NAMED_BY_PLACE[place](itemKind);

    return STORABLE_KINDS.find((kind) => kind === named) ?? null;
}
