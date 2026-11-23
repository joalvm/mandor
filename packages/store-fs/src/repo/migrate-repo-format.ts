import { join } from 'node:path';

import { foldImportedScripts, parseRepo, REPO_FORMAT, requestScriptsSchema } from '@mandor/schema';
import { z } from 'zod';

import { collectionEntries } from '../collection/collection-entries.js';
import {
    COLLECTION_DEFINITION_FILE,
    COLLECTION_EXTENSION,
    collectionDir,
    FOLDER_FILE,
} from '../collection/collection-path.js';
import { readDocument } from '../disk/read-document.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { workspaceFile } from '../workspace/workspace-path.js';
import { migrateWorkspaceVariables } from './migrate-workspace-variables.js';
import { repoFile } from './repo-path.js';

/**
 * The two keys of a file of the collection that hold scripts in format 2: the own ones, and what
 * an import left beside them. The global schema no longer knows the second.
 */
const scriptsFileSchema = z.object({
    scripts: requestScriptsSchema.optional(),
    importedScripts: z.unknown().optional(),
});

/** What an import left in `workspace.yaml`, the only key of it this step reads. */
const workspaceScriptsSchema = z.object({ importedScripts: z.unknown().optional() });

/**
 * Whether the repo file is sealed with an older format. Asked by version alone: before the first
 * release there are no origins outside development, so no machine that never migrated can bring
 * an old key back with a merge.
 */
export async function needsFormatMigration(root: string): Promise<boolean> {
    const repo = (await readOrThrow(repoFile(root), parseRepo)).value;

    return repo.formatVersion < REPO_FORMAT;
}

/**
 * Brings every workspace to the current format and seals the repo with it. The variables of a
 * workspace move into its environments; what an import left beside the scripts of a request, a
 * folder or a collection joins the own script of its moment, after it. Answers the files it
 * wrote, for the commit; nothing when there was nothing to do.
 */
export async function migrateRepoFormat(root: string): Promise<string[]> {
    const read = await readOrThrow(repoFile(root), parseRepo);
    const touched: string[] = [];

    for (const workspaceId of read.value.workspaces) {
        touched.push(...(await migrateWorkspaceVariables(root, workspaceId)));
        touched.push(...(await foldWorkspaceScripts(root, workspaceId)));
    }

    if (touched.length > 0 || read.value.formatVersion < REPO_FORMAT) {
        await writeDocument(repoFile(root), read.document, { formatVersion: REPO_FORMAT });
        touched.push(repoFile(root));
    }

    return touched;
}

/**
 * Folds the imported scripts of every file of a workspace. What the workspace itself held ran for
 * every request: it goes to the start of the root of each of its collections, where it keeps
 * running for all of them.
 */
async function foldWorkspaceScripts(root: string, workspaceId: string): Promise<string[]> {
    const file = workspaceFile(root, workspaceId);
    const read = await readDocument(file, (input) => workspaceScriptsSchema.parse(input));
    const shared = read.ok ? read.value.importedScripts : undefined;
    const dir = collectionDir(root, workspaceId);
    const touched: string[] = [];

    for (const name of (await collectionEntries(dir)).folders) {
        touched.push(...(await foldFile(join(dir, name, COLLECTION_DEFINITION_FILE), shared)));
        touched.push(...(await foldTree(join(dir, name))));
    }

    if (read.ok && shared !== undefined) {
        await writeDocument(file, read.document, { importedScripts: undefined });
        touched.push(file);
    }

    return touched;
}

/** Folds the items and the folders below a directory of the collection, at any depth. */
async function foldTree(dir: string): Promise<string[]> {
    const { folders, items } = await collectionEntries(dir);
    const touched: string[] = [];

    for (const name of items) {
        touched.push(...(await foldFile(join(dir, `${name}${COLLECTION_EXTENSION}`))));
    }

    for (const name of folders) {
        touched.push(...(await foldFile(join(dir, name, FOLDER_FILE))));
        touched.push(...(await foldTree(join(dir, name))));
    }

    return touched;
}

/**
 * Folds one file: its own imported scripts after its own text, then `shared` before all of it.
 * The key is taken out through the document, so the comments of the file survive. A file without
 * the key and with nothing shared is not touched; one that cannot be read stays as it is.
 */
async function foldFile(file: string, shared?: unknown): Promise<string[]> {
    const read = await readDocument(file, (input) => scriptsFileSchema.parse(input));

    if (!read.ok || (read.value.importedScripts === undefined && shared === undefined)) {
        return [];
    }

    const { scripts, importedScripts } = read.value;
    const folded = foldImportedScripts(
        foldImportedScripts(scripts, importedScripts),
        shared,
        'before',
    );
    const changed = JSON.stringify(folded) !== JSON.stringify(scripts);

    if (importedScripts === undefined && !changed) {
        return [];
    }

    await writeDocument(file, read.document, {
        importedScripts: undefined,
        ...(changed ? { scripts: folded } : {}),
    });

    return [file];
}
