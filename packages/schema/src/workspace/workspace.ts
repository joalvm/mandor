import type { AuthConfig } from '../auth/auth-config.js';
import type { ItemOrigin } from '../collection/item-origin.js';
import type { WorkspaceKind } from './workspace-kinds.js';

/** A project. Owns its environments, collection and docs; nothing is shared upward. */
export type Workspace = {
    id: string;
    kind: WorkspaceKind;
    name: string;
    /**
     * The auth everything below inherits from. Above this there is nothing, so inheriting
     * here means no auth: absent is the same as `{ inherit: true }`.
     */
    auth?: AuthConfig | undefined;
    /**
     * Where what an import wrote into this file came from: its `auth`. Absent means a person
     * wrote it, and an import then reports a conflict instead of writing over it.
     */
    importOrigin?: ItemOrigin | undefined;
    /**
     * The environment that rules when nobody chose one: a machine with no selection in Request,
     * a connection with no environment in Realtime. It travels with the workspace.
     */
    defaultEnvironment?: string | undefined;
};
