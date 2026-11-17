import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/**
 * Where a connection lives, named the way the workspace names it. A tab holds this and not the
 * connection name, so renaming the connection retitles its tabs instead of leaving them stale.
 */
export function connectionResource(
    originName: string,
    workspaceId: string,
    connectionId: string,
): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(originName),
        workspace: workspaceId,
        kind: 'connection',
        path: connectionId,
    });
}

/** The id back out of the URI. A resource of any other shape names no connection. */
export function connectionIdOf(resource: ResourceUri): string {
    const parts = parseResourceUri(resource);

    return parts.scope === 'workspace' && parts.kind === 'connection' ? parts.path : '';
}
