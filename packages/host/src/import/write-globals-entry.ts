import type { ImportPlanEntry } from '@mandor/interop-core';
import { variableSchema } from '@mandor/schema';
import { mergeImportedGlobals } from '@mandor/store-fs';
import { z } from 'zod';

const variablesSchema = z.array(variableSchema);

/**
 * Writes the globals a document carries into the globals of the origin: the names the origin
 * lacks come in, and a name it has keeps its value. A secret enters with its name and its mark.
 */
export async function writeGlobalsEntry(
    root: string,
    _workspaceId: string,
    entry: ImportPlanEntry,
): Promise<void> {
    await mergeImportedGlobals(
        root,
        variablesSchema.parse(entry.resource?.fields['variables'] ?? []),
    );
}

/**
 * The globals are the origin's, shared by every workspace of it: undoing an import of one
 * workspace takes nothing away from them. Kept as a remover so every place has one.
 */
export function keepGlobals(): Promise<void> {
    return Promise.resolve();
}
