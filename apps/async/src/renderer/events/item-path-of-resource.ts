import { parseResourceUri } from '@mandor/schema';

/**
 * Where an item sits in the collection, read from the resource it was loaded from; null for
 * free text, which names no resource, and for anything that is not an item of a workspace.
 * Main reads the chain of that place itself: the path is all a send says about it.
 */
export function itemPathOfResource(resource: string): string | null {
    if (resource === '') {
        return null;
    }

    const parts = parseResourceUri(resource);

    return parts.scope === 'workspace' && parts.kind === 'item' ? parts.path : null;
}
