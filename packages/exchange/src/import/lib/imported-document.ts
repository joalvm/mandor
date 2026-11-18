/**
 * What an import left behind, as the app that asked for it needs to know: the workspace it wrote
 * into. The dialog cannot reload the collections —it is not allowed to know their feature—, so
 * each app does.
 */
export type ImportedDocument = { workspaceId: string };
