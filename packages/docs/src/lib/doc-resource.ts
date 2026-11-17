import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/**
 * Where a doc lives. The file name is the path of the URI and the workspace is a part of it, so
 * a tab reads both off the resource it was handed and never asks the window where it is.
 */
export function docResource(origin: string, workspaceId: string, name: string): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'doc',
        path: name,
    });
}

/** The file name back out of the URI. A resource of any other shape names no doc. */
export function docNameOf(resource: ResourceUri): string {
    return docPartsOf(resource)?.path ?? '';
}

/** The workspace the doc belongs to, which is the workspace main is asked to read it from. */
export function docWorkspaceOf(resource: ResourceUri): string {
    return docPartsOf(resource)?.workspace ?? '';
}

function docPartsOf(resource: ResourceUri): { path: string; workspace: string } | null {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace' || parts.kind !== 'doc') {
        return null;
    }

    return { path: parts.path, workspace: parts.workspace };
}
