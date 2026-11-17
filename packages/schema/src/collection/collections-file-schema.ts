import { z } from 'zod';

import { slugSchema } from '../fields/slug-schema.js';
import { itemOriginSchema } from './item-origin-schema.js';

/** The envelope of `collections.yaml`: the order of the collections of the workspace. */
export const collectionsFileSchema = z.object({
    order: z.array(slugSchema).optional(),
    origin: itemOriginSchema.optional(),
});
