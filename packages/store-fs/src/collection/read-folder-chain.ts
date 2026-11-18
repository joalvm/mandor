import {
    collectionPlace,
    type FolderChainLevel,
    type FolderSettings,
    parseFolderSettings,
} from '@mandor/schema';

import { fileExists } from '../disk/file-exists.js';
import { readDocument } from '../disk/read-document.js';
import { readWorkspace } from '../workspace/read-workspace.js';
import { levelFile, levelOf } from './collection-level.js';
import { emptyFolderSettings } from './read-folder-settings.js';

/**
 * The chain above an item in one pass: every collection and folder of `parentPath`, the closest
 * first, and the workspace last with its auth. `null` — or the top level — is the workspace
 * alone. A file of the chain that cannot be read enters empty and says so, like a broken file
 * of a repo load: one bad file never stops a send.
 */
export async function readFolderChain(
    root: string,
    workspaceId: string,
    parentPath: string | null,
): Promise<FolderChainLevel[]> {
    const paths = pathsUp(parentPath ?? '');
    const groups = await Promise.all(paths.map((path) => groupLevel(root, workspaceId, path)));

    return [...groups, await workspaceLevel(root, workspaceId)];
}

/** `a/b/c` → `a/b/c`, `a/b`, `a`: the path and every group above it, the closest first. */
function pathsUp(path: string): string[] {
    const paths: string[] = [];

    for (let current = path; current !== ''; current = collectionPlace(current).parent) {
        paths.push(current);
    }

    return paths;
}

async function groupLevel(
    root: string,
    workspaceId: string,
    path: string,
): Promise<FolderChainLevel> {
    const file = levelFile(root, workspaceId, path);
    const read = await readDocument(file, parseFolderSettings);
    const head = { level: levelOf(path), place: { kind: 'folder', path } } as const;

    if (read.ok) {
        return { ...head, ...namedSettings(read.value) };
    }

    const empty = { ...head, ...namedSettings(emptyFolderSettings(root, workspaceId, path)) };

    return (await fileExists(file)) ? { ...empty, unreadable: true } : empty;
}

/** What a level hands down: everything its file says but its name and its order. */
function namedSettings(value: FolderSettings): {
    name: string;
    settings: FolderChainLevel['settings'];
} {
    const settings: Partial<FolderSettings> = { ...value };

    delete settings.name;
    delete settings.order;

    return { name: value.name, settings };
}

async function workspaceLevel(root: string, workspaceId: string): Promise<FolderChainLevel> {
    const read = await readWorkspace(root, workspaceId);
    const head = { level: 'workspace', place: { kind: 'workspace' } } as const;

    if (read.ok) {
        const { auth } = read.value;

        return { ...head, name: read.value.name, settings: auth === undefined ? {} : { auth } };
    }

    return { ...head, name: read.warning.name ?? workspaceId, settings: {}, unreadable: true };
}
