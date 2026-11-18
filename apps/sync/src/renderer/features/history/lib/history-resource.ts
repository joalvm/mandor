import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/** The list is one tab per workspace: its path is the fixed word, the kind says what it is. */
const LIST_PATH = 'all';

/** What a history resource names: the whole list of a workspace, or two sends side by side. */
export type HistoryParts =
    | { kind: 'all'; workspaceId: string }
    | { ids: readonly [string, string]; kind: 'diff'; workspaceId: string };

function workspaceResource(origin: string, workspaceId: string, path: string): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'history',
        path,
    });
}

/** The history of one workspace, as the one tab that shows it. */
export function historyResource(origin: string, workspaceId: string): ResourceUri {
    return workspaceResource(origin, workspaceId, LIST_PATH);
}

/** Two sends of a workspace compared: the order is the order of the columns. */
export function diffResource(
    origin: string,
    workspaceId: string,
    a: string,
    b: string,
): ResourceUri {
    return workspaceResource(origin, workspaceId, `${a}/${b}`);
}

/** What a resource of the history names, or nothing when it is of another kind or is not one. */
export function historyPartsOf(resource: ResourceUri): HistoryParts | null {
    try {
        const parts = parseResourceUri(resource);

        if (parts.scope !== 'workspace' || parts.kind !== 'history') {
            return null;
        }

        const [first, second, ...rest] = parts.path.split('/');

        if (parts.path === LIST_PATH) {
            return { kind: 'all', workspaceId: parts.workspace };
        }

        if (first === undefined || second === undefined || rest.length > 0) {
            return null;
        }

        return { ids: [first, second], kind: 'diff', workspaceId: parts.workspace };
    } catch {
        return null;
    }
}
