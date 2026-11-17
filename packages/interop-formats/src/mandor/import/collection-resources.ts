import {
    collectionResourceOf,
    inSequence,
    fingerprintOf,
    underCollection,
    type ImportResource,
} from '@mandor/interop-core';
import { ownScriptsOrNothing, type WorkspaceBundle } from '@mandor/schema';

import { mandorOrigin } from './mandor-origin.js';
import { claimSlug } from './claim-slug.js';

type BundleCollection = WorkspaceBundle['collections'][number];
type BundleItem = BundleCollection['items'][number];
type BundleFolder = BundleCollection['folders'][number];

/** Where a group of items files: the route they hang from and the names its directory has taken. */
type Directory = { route: string; taken: Set<string> };

function itemOf(item: BundleItem, route: string, sourceId: string): ImportResource {
    const fields = item.tags.length === 0 ? item.body : { ...item.body, tags: item.tags };

    return {
        place: 'item',
        itemKind: item.kind,
        route,
        name: item.name,
        fields,
        origin: mandorOrigin(sourceId, fingerprintOf({ name: item.name, ...fields })),
        degradations: [],
    };
}

function itemsOf(
    items: readonly BundleItem[],
    directory: Directory,
    sourceId: string,
): ImportResource[] {
    return items.map((item) => {
        const local = claimSlug(directory.taken, item.name, 'item');

        return itemOf(item, underCollection(directory.route, local), sourceId);
    });
}

/** What a folder declares of itself: an absent value and an empty list are no decision. */
function settingsOf({
    description,
    variables,
    auth,
    headers,
    importedScripts,
    scripts,
}: BundleFolder) {
    return Object.fromEntries(
        Object.entries({
            description,
            variables,
            auth,
            headers,
            importedScripts,
            scripts: ownScriptsOrNothing(scripts),
        }).filter(
            ([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0),
        ),
    );
}

function folderOf(folder: BundleFolder, route: string, sourceId: string): ImportResource {
    const fields = settingsOf(folder);

    return {
        place: 'folder',
        itemKind: null,
        route,
        name: folder.name,
        fields,
        origin: mandorOrigin(sourceId, fingerprintOf({ name: folder.name, ...fields })),
        degradations: [],
    };
}

/** A folder and all that hangs from it, its route growing from its parent. */
function folderResources(
    folder: BundleFolder,
    parent: Directory,
    sourceId: string,
): ImportResource[] {
    const route = underCollection(parent.route, claimSlug(parent.taken, folder.name, 'folder'));
    const here: Directory = { route, taken: new Set() };

    return [folderOf(folder, route, sourceId), ...levelResources(folder, here, sourceId)];
}

/**
 * What hangs from a level, in its arrangement. Each slug is claimed among its siblings. Folders
 * speak first, wherever they stand: an item that shares a name with one takes the suffix.
 */
function levelResources(
    level: Pick<BundleFolder, 'folders' | 'items' | 'sequence'>,
    directory: Directory,
    sourceId: string,
): ImportResource[] {
    const folders = level.folders.map((folder) => folderResources(folder, directory, sourceId));
    const items = itemsOf(level.items, directory, sourceId).map((item) => [item]);

    return inSequence(level.sequence, { folders, items }).flat();
}

function oneCollection(
    collection: BundleCollection,
    route: string,
    sourceId: string,
): ImportResource[] {
    const head = collectionResourceOf({
        name: collection.name,
        description: collection.description,
        auth: collection.auth,
        variables: collection.variables,
        headers: collection.headers,
        importedScripts: collection.importedScripts,
        scripts: collection.scripts,
        origin: { kind: 'mandor', sourceId },
    });
    const top: Directory = { route, taken: new Set() };

    return [{ ...head, route }, ...levelResources(collection, top, sourceId)];
}

/** The collections of the bundle as the resources they file: each one, its folders, its items. */
export function collectionResourcesOf(bundle: WorkspaceBundle, sourceId: string): ImportResource[] {
    const taken = new Set<string>();

    return bundle.collections.flatMap((collection) =>
        oneCollection(collection, claimSlug(taken, collection.name, 'collection'), sourceId),
    );
}
