import { freeName } from '@mandor/schema';

import type { WorkspaceCollectionSource, WorkspaceData } from './workspace-data.js';

/**
 * A document that joins every collection has one tag per name, and a tag of a folder is the name
 * of its first level. A folder whose name another collection already says goes by its collection
 * as well, so the two do not become one folder when the document comes back in.
 */
export function withFoldersApart(workspace: WorkspaceData): WorkspaceData {
    const taken = workspace.collections
        .filter((collection) => collection.items.length > 0)
        .map((collection) => collection.name);

    return {
        ...workspace,
        collections: workspace.collections.map((collection) => apart(collection, taken)),
    };
}

/** Each folder renamed if it must, and what it ends up called taken for the ones that follow. */
function apart(collection: WorkspaceCollectionSource, taken: string[]): WorkspaceCollectionSource {
    return {
        ...collection,
        folders: collection.folders.map((folder) => {
            const name = taken.includes(folder.name)
                ? freeName(`${collection.name} / ${folder.name}`, taken)
                : folder.name;

            taken.push(name);

            return { ...folder, name };
        }),
    };
}
