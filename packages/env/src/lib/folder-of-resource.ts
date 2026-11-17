import { parseResourceUri } from '@mandor/schema';

/** The group the tab of a folder looks at, or nothing for a tab of anything else. */
export function folderOfResource(resource: string): { workspaceId: string; path: string } | null {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace') {
        return null;
    }

    return { workspaceId: parts.workspace, path: parts.path };
}
