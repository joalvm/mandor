import { RESOURCE_PLACES, type ResourcePlace } from '../resource/resource-place.js';
import type { InteropScope } from './interop-scope.js';

/**
 * The places each scope covers. A collection owns itself, its folders and its items; what lives
 * above it — connections, environments, notes, the workspace file — belongs to the workspace.
 */
const PLACES_BY_SCOPE: Readonly<Record<InteropScope, ReadonlySet<ResourcePlace>>> = {
    collection: new Set<ResourcePlace>(['collection', 'folder', 'item']),
    workspace: new Set<ResourcePlace>(RESOURCE_PLACES),
};

/**
 * The resources a scope covers, in the order they came. A format reads a document whole and does
 * not know the scope: what falls outside is left here, so no format carries the rule.
 */
export function resourcesInScope<Resource extends { place: ResourcePlace }>(
    resources: readonly Resource[],
    scope: InteropScope,
): Resource[] {
    const covered = PLACES_BY_SCOPE[scope];

    return resources.filter(({ place }) => covered.has(place));
}
