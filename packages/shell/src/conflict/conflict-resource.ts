import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/**
 * Where a clash lives. The id of the record is the path of the URI and the workspace is a part
 * of it, so a tab reads what it is about off the resource it was handed.
 */
export function conflictResource(origin: string, workspaceId: string, id: string): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'conflict',
        path: id,
    });
}

/** The id of the clash back out of the URI. A resource of any other shape names none. */
export function conflictIdOf(resource: ResourceUri): string {
    const parts = parseResourceUri(resource);

    return parts.scope === 'workspace' && parts.kind === 'conflict' ? parts.path : '';
}

/** One tab per clash: the id of the tab says which, so asking to open it again finds it. */
export function conflictTabId(id: string): string {
    return `conflict:${id}`;
}
