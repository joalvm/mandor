import { formatResourceUri, slugify, type ResourceUri } from '@mandor/schema';

export function environmentResource(
    origin: string,
    workspaceId: string,
    environmentId: string,
): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'environment',
        path: environmentId,
    });
}
