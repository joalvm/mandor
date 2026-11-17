import {
    claimRoute,
    definedOnly,
    distinct,
    fingerprintOf,
    type ImportResource,
    type InteropDocument,
    type InteropGroup,
    type TakenRoutes,
} from '@mandor/interop-core';

import { extrasDegradations } from './extras-degradations.js';
import { folderSettingsOf } from './folder-settings-of.js';
import { originOf } from './origin-of.js';

/** The folders of the document as resources, and where each one sits on disk. */
export type FolderTree = {
    resources: ImportResource[];
    /** The route of each folder, by its path of names as JSON. */
    routes: Map<string, string>;
    taken: TakenRoutes;
};

export function pathKey(path: readonly string[]): string {
    return JSON.stringify(path);
}

/** One folder per group, parents first: a child asks its parent's route before it takes its own.
 * The folders of the first level hang from `base`, the collection the import arrived as. */
export function folderTreeOf(document: InteropDocument, base = ''): FolderTree {
    const tree: FolderTree = {
        resources: [],
        routes: new Map(),
        taken: new Map([[base, new Set()]]),
    };

    for (const group of document.groups ?? []) {
        const parent = tree.routes.get(pathKey(group.path.slice(0, -1))) ?? base;
        const name = group.path.slice(-1).join('');
        const route = claimRoute(tree.taken, parent, name, 'folder');

        tree.routes.set(pathKey(group.path), route);
        tree.resources.push(folderResourceOf(document, group, name, route));
    }

    return tree;
}

function folderResourceOf(
    document: InteropDocument,
    group: InteropGroup,
    name: string,
    route: string,
): ImportResource {
    const level = folderSettingsOf(group, document.security, 'folder');
    const extras = extrasDegradations(group.extras, 'folder');
    const fields = definedOnly(level.settings);

    return {
        place: 'folder',
        itemKind: null,
        route,
        name,
        fields,
        origin: originOf(document.sourceId, fingerprintOf({ name, ...fields })),
        degradations: distinct([...level.degradations, ...extras.degradations]),
    };
}
