import type { CollectionItem } from '@mandor/schema';

import type { InteropScope } from '../scope/interop-scope.js';
import { childrenInOrder } from './children-in-order.js';
import type { WorkspaceData, WorkspaceFolderNode } from './workspace-data.js';
import { workspaceDataInScope } from './workspace-data-in-scope.js';
import {
    collectionId,
    connectionId,
    docId,
    environmentId,
    folderId,
    itemId,
    SETTINGS_ID,
} from './outline-ids.js';

function itemsChosen(
    holder: string,
    items: readonly CollectionItem[],
    chosen: ReadonlySet<string>,
): CollectionItem[] {
    return items.filter((_item, index) => chosen.has(itemId(holder, index)));
}

/**
 * A level stays, with what it declares, while anything under it is chosen: what a request inherits
 * travels with it, so siblings go and ancestors never do. A level with nothing under it at all is
 * a leaf of the outline, and stays when it is chosen by itself.
 */
function levelChosen(
    level: WorkspaceFolderNode,
    id: string,
    chosen: ReadonlySet<string>,
): WorkspaceFolderNode[] {
    const kept = level.folders.map((folder, index) =>
        levelChosen(folder, folderId(id, index), chosen),
    );
    const folders = kept.flat();
    const items = itemsChosen(id, level.items, chosen);
    const empty = level.folders.length === 0 && level.items.length === 0;
    const stays = folders.length > 0 || items.length > 0 || (empty && chosen.has(id));

    return stays ? [{ ...level, folders, items, ...arrangedOf(level, kept, id, chosen) }] : [];
}

/** What stays of the arrangement of a level, so what is left keeps the order it had. */
function arrangedOf(
    level: WorkspaceFolderNode,
    kept: readonly (readonly WorkspaceFolderNode[])[],
    id: string,
    chosen: ReadonlySet<string>,
): Pick<WorkspaceFolderNode, 'sequence'> {
    if (level.sequence === undefined) {
        return {};
    }

    return {
        sequence: childrenInOrder<'folder' | 'item'>(level, {
            folder: (_folder, index) => ((kept[index] ?? []).length > 0 ? ['folder'] : []),
            item: (_item, index) => (chosen.has(itemId(id, index)) ? ['item'] : []),
        }),
    };
}

/** The auth of the workspace and the globals of its origin go together, and only when chosen. */
function settingsChosen(
    data: WorkspaceData,
    chosen: ReadonlySet<string>,
): Pick<WorkspaceData, 'auth' | 'globals'> {
    return chosen.has(SETTINGS_ID)
        ? { auth: data.auth, globals: data.globals }
        : { auth: undefined, globals: [] };
}

/**
 * The workspace cut down to the leaves the user left marked, named by the routes the outline
 * handed out, and to what the scope covers: a collection export never writes a connection or an
 * environment, whatever the request names. What is not a leaf is not asked: a folder with
 * nothing marked under it is gone, and one that stays keeps what it declares.
 */
export function selectWorkspaceData(
    data: WorkspaceData,
    chosen: ReadonlySet<string>,
    scope: InteropScope,
): WorkspaceData {
    const reached = workspaceDataInScope(data, scope);

    return {
        ...reached,
        ...settingsChosen(reached, chosen),
        docs: reached.docs.filter((doc) => chosen.has(docId(doc))),
        connections: reached.connections.filter((connection) =>
            chosen.has(connectionId(connection)),
        ),
        environments: reached.environments.filter((environment) =>
            chosen.has(environmentId(environment)),
        ),
        collections: reached.collections.flatMap((collection, index) =>
            levelChosen(collection, collectionId(index), chosen),
        ),
    };
}
