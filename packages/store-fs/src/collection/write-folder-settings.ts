import { mkdir } from 'node:fs/promises';

import { type FolderSettings, parseFolderSettings } from '@mandor/schema';

import { documentOf } from '../disk/document-of.js';
import { fileExists } from '../disk/file-exists.js';
import { FileReadError } from '../disk/file-read-error.js';
import { readDocument } from '../disk/read-document.js';
import { writeDocument } from '../disk/write-document.js';
import { levelFile } from './collection-level.js';
import { folderDir } from './collection-path.js';
import { emptyFolderSettings } from './read-folder-settings.js';

/** The keys a write changes on a group. A key worth `undefined` is taken out of the file. */
export type FolderSettingsPatch = Partial<FolderSettings>;

/**
 * Writes the keys of `patch` into the file of one collection or folder, the file its level
 * names. What the patch leaves out is not touched — comments, key order and the keys this
 * version does not know included — because the change goes into the loaded tree. The merged
 * value is validated before anything is written, a file nobody can read is refused rather than
 * written over, and a group without a file gets one called like its directory. It takes no turn:
 * host calls it from inside the gate that already holds the turn of the repo.
 */
export async function writeFolderSettings(
    root: string,
    workspaceId: string,
    path: string,
    patch: FolderSettingsPatch,
): Promise<void> {
    const file = levelFile(root, workspaceId, path);
    const existing = await readDocument(file, parseFolderSettings);

    if (!existing.ok && (await fileExists(file))) {
        throw new FileReadError(existing.warning);
    }

    const base = existing.ok ? existing.value : emptyFolderSettings(root, workspaceId, path);
    const merged = parseFolderSettings({ ...base, ...patch });
    const changes = Object.fromEntries(
        keysOf(patch).map((key) => [key, patch[key] === undefined ? undefined : merged[key]]),
    );

    if (existing.ok) {
        await writeDocument(file, existing.document, changes);

        return;
    }

    await mkdir(folderDir(root, workspaceId, path), { recursive: true });
    await writeDocument(file, documentOf({ name: base.name }), changes);
}

function keysOf(patch: FolderSettingsPatch): (keyof FolderSettings)[] {
    return Object.keys(patch) as (keyof FolderSettings)[];
}
