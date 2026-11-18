import { z } from 'zod';

import { collectionPathSchema } from '../collection/collection-path-schema.js';
import type { AuthPlace } from './auth-place.js';

/** One level of the chain, as a channel carries it. The folder path is a collection path. */
export const authPlaceSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('workspace') }).strict(),
    z.object({ kind: z.literal('folder'), path: collectionPathSchema }).strict(),
]) satisfies z.ZodType<AuthPlace>;
