import type { ImportPlanEntry } from '@mandor/interop-core';
import { authConfigSchema, type ConcreteAuth, type ItemOrigin } from '@mandor/schema';
import { writeImportedWorkspace } from '@mandor/store-fs';

/**
 * Writes what the import carries for the workspace file itself: its auth, with the origin that
 * says the import wrote it. `fields` is the patch as the mapper
 * built it, each key read with its own schema. `inherit` is the workspace's default: no auth.
 */
export async function writeWorkspaceEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
    identity: ItemOrigin | null,
): Promise<void> {
    const fields = entry.resource?.fields ?? {};

    await writeImportedWorkspace(
        root,
        workspaceId,
        { auth: authOf(fields['auth']) },
        entry.resource?.origin ?? identity,
    );
}

/** `inherit` is the workspace's default, and nothing above it to inherit from: no auth. */
function authOf(raw: unknown): ConcreteAuth | null {
    const auth = raw === undefined || raw === null ? undefined : authConfigSchema.parse(raw);

    return auth === undefined || 'inherit' in auth ? null : auth;
}
