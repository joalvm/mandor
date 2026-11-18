import type { InteropScope } from '@mandor/interop-core';
import type { ImportTarget } from '@mandor/ipc';

/**
 * What a door of import needs from the window to ask main for anything. A collection lands in
 * the workspace that is open, so it can do nothing without one; a workspace lands in a new one
 * named after the document, so it needs none — and the plan compares with nothing.
 */
type ImportDoor = {
    /** The workspace the plan is compared with, or `null` when the door cannot ask yet. */
    comparedWith: (activeWorkspaceId: string | null) => { workspaceId?: string } | null;
    /** Where the plan is written, once the document has told its name. */
    target: (activeWorkspaceId: string | null, name: string) => ImportTarget | null;
};

const INTO_THE_OPEN_WORKSPACE: ImportDoor = {
    comparedWith: (active) => (active === null ? null : { workspaceId: active }),
    target: (active) => (active === null ? null : { workspaceId: active }),
};

const INTO_A_NEW_WORKSPACE: ImportDoor = {
    comparedWith: () => ({}),
    target: (_active, name) => ({ newWorkspace: name }),
};

export const IMPORT_DOORS: Record<InteropScope, ImportDoor> = {
    collection: INTO_THE_OPEN_WORKSPACE,
    workspace: INTO_A_NEW_WORKSPACE,
};
