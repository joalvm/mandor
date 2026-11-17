import { z } from 'zod';

import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import { itemOriginSchema } from './item-origin-schema.js';

/**
 * What an item file has to say for the collection to list it. Loose on purpose: the keys of the
 * kind travel through untouched, and a strict object would delete the work of the other app.
 */
export const collectionItemEnvelopeSchema = z
    .object({
        kind: slugSchema,
        name: entityNameSchema,
        tags: z.array(entityNameSchema).optional(),
        origin: itemOriginSchema.optional(),
    })
    .loose();

/** One item as it travels flat: envelope keys and the keys of its kind at the same level. */
export type CollectionItemFields = z.infer<typeof collectionItemEnvelopeSchema>;
