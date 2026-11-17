import {
    CHANNELS,
    collectionChainRequestSchema,
    collectionSettingsWriteRequestSchema,
    type Empty,
    failure,
    type Result,
    success,
} from '@mandor/ipc';
import type { FolderChainLevel } from '@mandor/schema';
import {
    absentWhenEmpty,
    patchFolderSettings,
    readFolderChain,
    readFolderSettings,
    workspaceFile,
    writeFolderSettings,
} from '@mandor/store-fs';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeRepo } from '../origin/active-repo.js';
import { rememberDisk } from '../repo/remember-disk.js';
import { repoRelative } from '../repo/repo-relative.js';
import { guardedWrite } from '../repo/guarded-write.js';
import { isFolder, orderPlace } from './collection-places.js';

/**
 * What the collections and folders of the active origin say about themselves, as the window
 * reads them: the whole chain above a place in one answer, so variables, auth and headers of a
 * tab come from the same version of disk.
 */
export function registerFolderSettingsHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.collectionChain, (_event, raw) => chain(raw));
    ipc.handle(CHANNELS.collectionSettingsWrite, (_event, raw) => writeSettings(raw));

    return () => {
        ipc.removeHandler(CHANNELS.collectionChain);
        ipc.removeHandler(CHANNELS.collectionSettingsWrite);
    };
}

async function chain(raw: unknown): Promise<Result<FolderChainLevel[]>> {
    const request = collectionChainRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { root } = repo.value;
        const { workspaceId, parentPath } = request.data;
        const levels = await readFolderChain(root, workspaceId, parentPath);

        // What the window is handed is what a write of it will be merged against: a change
        // that lands on disk later is told apart from the window's own edit by this text.
        await rememberDisk(
            root,
            levels.map((level) => filePlaceOf(root, workspaceId, level)),
        );

        return success(levels);
    } catch (error) {
        return failureOf(error);
    }
}

/**
 * Patches what the window edits of a collection or a folder. The write merges against the text
 * the window was handed, so what another machine wrote meanwhile is kept, and what the patch does
 * not name is never touched. A folder that is gone is not brought back by a late write.
 */
async function writeSettings(raw: unknown): Promise<Result<Empty>> {
    const request = collectionSettingsWriteRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { root } = repo.value;
        const { workspaceId, path } = request.data;
        const patch = absentWhenEmpty(request.data.patch);

        if (!(await isFolder(root, workspaceId, path))) {
            return failure('not-found', 'the folder is not there anymore');
        }

        const { name } = await readFolderSettings(root, workspaceId, path);

        await guardedWrite({
            root,
            path: orderPlace(root, workspaceId, path),
            change: { kind: 'update-folder', name },
            oursFrom: (base) =>
                patchFolderSettings(base ?? `name: ${JSON.stringify(name)}\n`, patch),
            write: () => writeFolderSettings(root, workspaceId, path, patch),
        });

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}

/** The file one level of the chain was read from, spelled for the repo. */
function filePlaceOf(root: string, workspaceId: string, level: FolderChainLevel): string {
    if (level.place.kind === 'folder') {
        return orderPlace(root, workspaceId, level.place.path);
    }

    return repoRelative(root, workspaceFile(root, workspaceId));
}
