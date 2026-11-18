import type { Tab } from '../tab/tab.js';

/**
 * Where a resource ends up once `from` has been renamed to `to`. A folder takes everything
 * under it along, and the separator is what tells a descendant from a name that merely starts
 * the same way: `.../guias-viejas/x.md` is not inside `.../guias`.
 */
export function movedResource(resource: Tab['resource'], from: string, to: string): string {
    if (resource === from) {
        return to;
    }

    return resource.startsWith(`${from}/`) ? `${to}${resource.slice(from.length)}` : resource;
}
