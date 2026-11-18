import { type Environment, parseEnvironment } from '@mandor/schema';

import { atomicWrite } from '../disk/atomic-write.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { editEnvironmentDocument, type EnvironmentPatch } from './environment-text-with.js';
import { environmentFile } from './environment-path.js';
import { keepSecrets, type SecretKeeper } from './secret-keeper.js';

/** One edit of one environment: where it lives, what changes, and where its secrets go. */
export type EnvironmentEdit = {
    root: string;
    workspaceId: string;
    environmentId: string;
    changes: EnvironmentPatch;
    keep?: SecretKeeper;
};

/**
 * Applies a validated edit while preserving comments and unknown keys. What comes back is the
 * environment as the file now holds it, so a renderer that repaints from the answer never sees
 * a secret value it did not already have.
 */
export async function updateEnvironment(edit: EnvironmentEdit): Promise<Environment> {
    const path = environmentFile(edit.root, edit.workspaceId, edit.environmentId);
    const read = await readOrThrow(path, parseEnvironment);
    const edited = editEnvironmentDocument(read.document, read.value, edit.changes);

    await keepSecrets(edit.keep, edited.updated);
    await atomicWrite(path, edited.text);

    return edited.safe;
}
