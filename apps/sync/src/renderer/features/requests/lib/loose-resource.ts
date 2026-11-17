import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/** The kind of the tab of a request saved nowhere yet. */
export const LOOSE_REQUEST_TAB_KIND = 'loose-request';

/**
 * A request of the workspace that belongs to no collection: it lives in the window until the
 * person says where it goes, so its path is an id nobody chose and no file answers to it.
 */
export function looseResource(origin: string, workspaceId: string, id: string): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'loose',
        path: id,
    });
}

/** The id and the workspace of a request saved nowhere, or nothing for any other resource. */
export function loosePartsOf(resource: ResourceUri): { id: string; workspaceId: string } | null {
    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace' || parts.kind !== 'loose') {
        return null;
    }

    return { id: parts.path, workspaceId: parts.workspace };
}

/** The tab of a request saved nowhere: one per request, named after it. */
export function looseTabId(id: string): string {
    return `${LOOSE_REQUEST_TAB_KIND}-${id}`;
}
