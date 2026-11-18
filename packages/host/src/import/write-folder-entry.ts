import type { ImportPlanEntry } from '@mandor/interop-core';
import { collectionPlace } from '@mandor/schema';
import {
    createCollectionFolder,
    NameTakenError,
    type NewCollectionFolder,
    readFolderSettings,
    writeFolderSettings,
} from '@mandor/store-fs';

import {
    carriedBy,
    claimOf,
    holdsSettings,
    setByHand,
    settingsPatchOf,
} from './carried-settings.js';
import { FolderImportTakenError } from './folder-import-taken-error.js';
import { ownFolderFingerprint } from './own-collection.js';

/**
 * Writes one folder of the document on the route the mapper chose. A folder already there keeps
 * its order; its settings and scripts are the import's only while the fingerprint they were
 * written with still matches, so a person who edited any of them since is never overwritten: the
 * entry fails with `FolderImportTakenError` instead.
 */
export async function writeFolderEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
): Promise<void> {
    const { parent, name: id } = collectionPlace(entry.route);

    await createIfAbsent(root, workspaceId, parent, { id, name: entry.name });

    const folder = await readFolderSettings(root, workspaceId, entry.route);
    const carried = carriedBy(entry);
    const origin = entry.resource?.origin;
    const incoming = holdsSettings(carried);
    const byHand = setByHand(folder, origin, ownFolderFingerprint(folder));

    if (byHand && incoming) {
        throw new FolderImportTakenError(entry.route);
    }

    if (byHand) {
        await writeFolderSettings(root, workspaceId, entry.route, { name: entry.name });

        return;
    }

    // One write for what the import carries and the origin that owns it: a crash between the two
    // would leave an auth with no owner, and the next import would call it a person's.
    await writeFolderSettings(root, workspaceId, entry.route, {
        name: entry.name,
        ...settingsPatchOf(carried),
        importOrigin: incoming ? claimOf(origin, ownFolderFingerprint(carried)) : undefined,
    });
}

async function createIfAbsent(
    root: string,
    workspaceId: string,
    parent: string,
    folder: NewCollectionFolder,
): Promise<void> {
    try {
        await createCollectionFolder(root, workspaceId, parent, folder);
    } catch (error) {
        if (!(error instanceof NameTakenError)) {
            throw error;
        }
    }
}
