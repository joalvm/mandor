import {
    type ConcreteAuth,
    type ImportedScript,
    importedScriptSchema,
    type ItemOrigin,
    parseWorkspace,
} from '@mandor/schema';
import { z } from 'zod';

import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { workspaceFile } from './workspace-path.js';

/** What an import writes into `workspace.yaml`. Every key is said, so each caller states its wish. */
export type ImportedWorkspacePatch = {
    /** null takes the key out. */
    auth: ConcreteAuth | null;
    /** null or empty takes the key out. */
    importedScripts: readonly ImportedScript[] | null;
};

const scriptsSchema = z.array(importedScriptSchema);

/**
 * Writes what an import carries for the workspace itself — its auth and its scripts — together
 * with the origin that says who wrote them, in one write: a crash between the two would leave an
 * auth with no owner, and the next import would call it a person's. The file is read first so comments and the keys no reader knows about survive.
 * `null` for the origin takes the claim away.
 */
export async function writeImportedWorkspace(
    root: string,
    workspaceId: string,
    patch: ImportedWorkspacePatch,
    origin: ItemOrigin | null,
): Promise<void> {
    const file = workspaceFile(root, workspaceId);
    const read = await readOrThrow(file, parseWorkspace);
    const scripts = scriptsSchema.parse(patch.importedScripts ?? []);

    await writeDocument(file, read.document, {
        auth: patch.auth ?? undefined,
        importedScripts: scripts.length > 0 ? scripts : undefined,
        importOrigin: origin ?? undefined,
    });
}
