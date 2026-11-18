import { INTEROP_SCOPES } from '@mandor/interop-core';
import { collectionPathSchema } from '@mandor/schema';
import { z } from 'zod';

/**
 * What an export covers, as the two requests of it ask: the whole workspace, or one collection
 * named by its route. The renderer never names a path of the disk, only a place of the workspace.
 */
export const exportScopeShape = {
    scope: z.enum(INTEROP_SCOPES),
    collection: collectionPathSchema.optional(),
};

type ScopeAsked = { scope: string; collection?: string | undefined };

/** A collection scope names its collection, and the workspace scope names none. */
export function namesItsCollection({ scope, collection }: ScopeAsked): boolean {
    return (scope === 'collection') === (collection !== undefined);
}

/** The refusal the two requests give when the scope and the collection do not agree. */
export const SCOPE_DISAGREES = {
    message: 'a collection scope names its collection, and the workspace scope names none',
    path: ['collection'],
};
