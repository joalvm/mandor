import { basename } from 'node:path';

import { type FolderSettings, parseFolderSettings } from '@mandor/schema';

import { readDocument } from '../disk/read-document.js';
import { levelFile } from './collection-level.js';
import { folderDir } from './collection-path.js';

/**
 * One collection or folder as its file says it, read from the file its level names. A group
 * without a file is still a group — the directory is the truth about what exists — so the read
 * falls back to what an empty file would say, called like its directory.
 */
export async function readFolderSettings(
    root: string,
    workspaceId: string,
    path: string,
): Promise<FolderSettings> {
    const read = await readDocument(levelFile(root, workspaceId, path), parseFolderSettings);

    if (read.ok) {
        return read.value;
    }

    return emptyFolderSettings(root, workspaceId, path);
}

/** What a group with no file says: its directory's name and no order. */
export function emptyFolderSettings(
    root: string,
    workspaceId: string,
    path: string,
): FolderSettings {
    return { name: basename(folderDir(root, workspaceId, path)), order: [] };
}
