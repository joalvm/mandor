import type { ImportPlanEntry } from '@mandor/interop-core';
import { collectionPlace } from '@mandor/schema';
import {
    createCollection,
    NameTakenError,
    readFolderSettings,
    writeFolderSettings,
} from '@mandor/store-fs';

import { carriedBy, claimOf, setByHand, settingsPatchOf } from './carried-settings.js';
import { ownFingerprint } from './own-collection.js';

/**
 * Writes the collection the document arrives as, on the route the mapper chose, with its settings.
 * A collection already there with the same origin is updated; its settings are the import's only
 * while the fingerprint they were written with still matches, so one a person set or edited keeps
 * them, and the import only refreshes the name it answers to — writing over them would take what a
 * person chose, so that case says so.
 */
export async function writeCollectionEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
): Promise<void> {
    await createIfAbsent(root, workspaceId, {
        id: collectionPlace(entry.route).name,
        name: entry.name,
    });

    const collection = await readFolderSettings(root, workspaceId, entry.route);
    const origin = entry.resource?.origin;

    if (setByHand(collection, origin, ownFingerprint(collection))) {
        await writeFolderSettings(root, workspaceId, entry.route, { name: entry.name });

        return;
    }

    const carried = carriedBy(entry);

    // One write for what the import carries and the origin that owns it: a crash between the two
    // would leave an auth with no owner, and the next import would call it a person's.
    await writeFolderSettings(root, workspaceId, entry.route, {
        name: entry.name,
        ...settingsPatchOf(carried),
        importOrigin: claimOf(origin, ownFingerprint({ name: entry.name, ...carried })),
    });
}

async function createIfAbsent(
    root: string,
    workspaceId: string,
    collection: { id: string; name: string },
): Promise<void> {
    try {
        await createCollection(root, workspaceId, collection);
    } catch (error) {
        if (!(error instanceof NameTakenError)) {
            throw error;
        }
    }
}
