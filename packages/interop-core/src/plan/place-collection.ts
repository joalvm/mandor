import type { ExistingResource } from '../resource/existing-resource.js';
import type { ImportResource } from '../resource/import-resource.js';
import { underCollection } from '../resource/collection-resource.js';

/** The places that live under the collection route: the collection, its folders and its items. */
const UNDER_COLLECTION = new Set<ImportResource['place']>(['collection', 'folder', 'item']);

/**
 * Moves the whole import onto the route its collection should take in this workspace. The
 * collection the same document wrote before keeps it, wherever the person renamed it to; a
 * collection a person made is never touched: the import files its own under a new id, so
 * nothing the document carries lands inside a stranger's collection.
 */
export function placeCollection(
    resources: readonly ImportResource[],
    existing: readonly ExistingResource[],
    mint: () => string,
): readonly ImportResource[] {
    const collection = resources.find((resource) => resource.place === 'collection');

    if (collection === undefined) {
        return resources;
    }

    const route = routeFor(collection, existing, mint);

    if (route === collection.route) {
        return resources;
    }

    return resources.map((resource) => rerouted(resource, collection.route, route));
}

function routeFor(
    collection: ImportResource,
    existing: readonly ExistingResource[],
    mint: () => string,
): string {
    const own = existing.find(
        (each) => each.place === 'collection' && sameSource(each, collection),
    );

    return own?.route ?? mint();
}

function sameSource(current: ExistingResource, collection: ImportResource): boolean {
    return (
        current.origin?.kind === collection.origin.kind &&
        current.origin.sourceId === collection.origin.sourceId
    );
}

function rerouted(resource: ImportResource, from: string, to: string): ImportResource {
    const local = localRoute(resource.route, from);

    if (!UNDER_COLLECTION.has(resource.place) || local === undefined) {
        return resource;
    }

    return { ...resource, route: underCollection(to, local) };
}

/** The route inside the collection, or nothing for a route that does not sit under it. */
function localRoute(route: string, collection: string): string | undefined {
    if (route === collection) {
        return '';
    }

    return route.startsWith(`${collection}/`) ? route.slice(collection.length + 1) : undefined;
}
