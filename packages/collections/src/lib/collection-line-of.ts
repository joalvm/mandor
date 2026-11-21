import { parseResourceUri, type ResourceUriParts } from '@mandor/schema';

import { exampleRowId } from './example-row-id.js';

/**
 * Where a resource stands in the tree of one workspace: the id of its line, the folders that have
 * to be open for the line to be drawn, outermost first, and the item whose examples have to be
 * shown when the line is one of them.
 */
export type CollectionLineSpot = {
    examplesOf: string | null;
    folders: string[];
    line: string;
};

type WorkspaceKind = Extract<ResourceUriParts, { scope: 'workspace' }>['kind'];

/** The folders a path sits in, outermost first: `a/b/c.yaml` sits in `a` and in `a/b`. */
function foldersOf(path: string): string[] {
    const segments = path.split('/');

    return segments.slice(1).map((_, index) => segments.slice(0, index + 1).join('/'));
}

function nodeSpot(path: string): CollectionLineSpot {
    return { examplesOf: null, folders: foldersOf(path), line: path };
}

/** An example is filed under its item: `pedidos/pagado/ok` is the example `ok` of `pedidos/pagado`. */
function exampleSpot(path: string): CollectionLineSpot | null {
    const slash = path.lastIndexOf('/');

    if (slash === -1) {
        return null;
    }

    const itemPath = path.slice(0, slash);

    return {
        examplesOf: itemPath,
        folders: foldersOf(itemPath),
        line: exampleRowId(itemPath, path.slice(slash + 1)),
    };
}

/** The kinds of resource the tree draws a line for; every other kind has none in it. */
const SPOT_OF_KIND: Partial<Record<WorkspaceKind, (path: string) => CollectionLineSpot | null>> = {
    example: exampleSpot,
    folder: nodeSpot,
    item: nodeSpot,
};

function partsOrNull(resource: string): ResourceUriParts | null {
    try {
        return parseResourceUri(resource);
    } catch {
        return null;
    }
}

/** The line of the tree of `workspaceId` that a resource stands for, or nothing when it has none. */
export function collectionLineOf(resource: string, workspaceId: string): CollectionLineSpot | null {
    const parts = partsOrNull(resource);

    if (parts?.scope !== 'workspace' || parts.workspace !== workspaceId) {
        return null;
    }

    return SPOT_OF_KIND[parts.kind]?.(parts.path) ?? null;
}
