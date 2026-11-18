import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

export function itemResource(origin: string, workspaceId: string, path: string): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'item',
        path,
    });
}

export function itemPartsOf(resource: ResourceUri): { path: string; workspaceId: string } | null {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace' || parts.kind !== 'item') {
        return null;
    }

    return { path: parts.path, workspaceId: parts.workspace };
}
