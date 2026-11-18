import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/** The resource of the tab of one collection or folder: one tab per group of the tree. */
export function folderResource(origin: string, workspaceId: string, path: string): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'folder',
        path,
    });
}

/** The group a folder resource names, or nothing for any other resource. */
export function folderPartsOf(resource: string): { path: string; workspaceId: string } | null {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace' || parts.kind !== 'folder') {
        return null;
    }

    return { path: parts.path, workspaceId: parts.workspace };
}
