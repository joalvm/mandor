/** What an import or an export covers: one collection, or the whole workspace. */
export const INTEROP_SCOPES = ['collection', 'workspace'] as const;

export type InteropScope = (typeof INTEROP_SCOPES)[number];
