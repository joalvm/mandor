import type { ImportPlanEntry } from '@mandor/interop-core';

export const ORIGIN = { kind: 'postman', sourceId: 'collections:1' } as const;

/** An `add` entry for a folder, carrying the given fields as the mapper would. */
export function folderEntry(
    route: string,
    name: string,
    fields: Record<string, unknown> = {},
): ImportPlanEntry {
    return {
        class: 'add',
        place: 'folder',
        route,
        name,
        selected: true,
        resource: {
            place: 'folder',
            itemKind: null,
            route,
            name,
            fields,
            origin: ORIGIN,
            degradations: [],
        },
    };
}
