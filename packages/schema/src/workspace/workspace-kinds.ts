/** Runtime values for the app path chosen when a workspace is created. */
export const WORKSPACE_KINDS = ['async', 'sync'] as const;

/** The two app paths, chosen at workspace creation. A workspace never changes kind. */
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];
